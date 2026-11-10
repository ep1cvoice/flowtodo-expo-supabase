import { strings } from '@/shared/lib/strings';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AUTH_BOOTSTRAP_TIMEOUT_MS } from '@/core/auth/constants';
import { resolveDekFromPassword } from '@/core/auth/dek';
import { useEncryptionActions } from '@/core/auth/EncryptionContext';
import {
  fetchProfile,
  minimalUserFromSession,
  updateProfileSettings,
} from '@/core/auth/profile';
import { toastForError } from '@/shared/lib/networkError';
import { pausePomodoroBeforeLogout } from '@/features/pomodoro/lib/pomodoroLogoutBridge';
import { withTimeout } from '@/shared/lib/withTimeout';
import { supabase } from '@/core/supabase/client';
import type { ProfileUpdates, User } from '@/types';
import { logger } from '@/shared/lib/logger';

/**
 * Session/profile state only. The DEK and biometric unlock live in
 * EncryptionContext so DEK changes don't re-render every useAuth consumer.
 */
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateProfile: (updates: ProfileUpdates) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
}

const HANDLED_AUTH_EVENTS = new Set<string>(['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED']);

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setDek, clearDek, resetEncryption } = useEncryptionActions();
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Only true during signIn/signUp. Unlock must NOT set this — UnlockGate
  // shows the app when this is true so the login screen can stay mounted.
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_BOOTSTRAP_TIMEOUT_MS,
          'getSession'
        );

        const session = data.session;
        if (session?.user) {
          const profile =
            (await fetchProfile(session.user.id, session.user.email)) ??
            minimalUserFromSession(session.user.id, session.user.email);
          if (isMounted) setUserState(profile);
        }
      } catch (err) {
        logger.warn('Session bootstrap failed:', (err as Error)?.message ?? err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    // Not async and no Supabase calls inside the callback: awaiting supabase-js from
    // within onAuthStateChange can deadlock. Profile loading is deferred instead.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
        if (isMounted) {
          setUserState(null);
          clearDek();
        }
        return;
      }
      // TOKEN_REFRESHED and other events carry no profile change.
      if (!HANDLED_AUTH_EVENTS.has(event) || !session?.user) return;

      const { id, email } = session.user;
      setTimeout(() => {
        void (async () => {
          try {
            const profile = (await fetchProfile(id, email)) ?? minimalUserFromSession(id, email);
            if (isMounted) setUserState(profile);
          } catch (err) {
            logger.warn('onAuthStateChange profile load failed:', (err as Error)?.message ?? err);
            if (isMounted) setUserState(minimalUserFromSession(id, email));
          }
        })();
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearDek]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setIsAuthenticating(true);
      try {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          AUTH_BOOTSTRAP_TIMEOUT_MS,
          'signIn'
        );

        if (error || !data.user) {
          return { error: error?.message ?? strings.auth.login.signInFailed };
        }

        const resolved = await resolveDekFromPassword({
          userId: data.user.id,
          password,
          decryptFailLog: strings.auth.errors.decryptDekLog,
          decryptFailError: strings.auth.errors.invalidPasswordOrCorrupted,
        });
        if (!resolved.ok) {
          await supabase.auth.signOut();
          return { error: resolved.error };
        }

        setDek(resolved.dek);
        // Note: this does NOT silently enable biometric unlock. Persisting
        // the DEK to the secure store is an explicit opt-in via
        // enableBiometricUnlock() (e.g. a settings toggle or a one-time
        // prompt after first login) — signIn only puts it in memory.
        return { error: null };
      } catch (err) {
        logger.warn('signIn failed:', (err as Error)?.message ?? err);
        return { error: toastForError(err, strings.auth.login.signInFailed) };
      } finally {
        setIsAuthenticating(false);
      }
    },
    [setDek]
  );

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    setIsAuthenticating(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });

      if (error || !data.user) {
        return { error: error?.message ?? 'Sign up failed' };
      }

      return { error: null };
    } catch (unexpectedError) {
      logger.error(strings.auth.register.unexpectedErrorLog, unexpectedError);
      return { error: strings.auth.register.unexpectedError };
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await pausePomodoroBeforeLogout();
    try {
      await supabase.auth.signOut();
    } finally {
      await resetEncryption();
    }
  }, [resetEncryption]);

  const userId = user?.id ?? null;

  const updateProfile = useCallback(
    async (updates: ProfileUpdates) => {
      if (!userId) {
        return { error: strings.common.notSignedIn };
      }

      const { error, applied } = await updateProfileSettings(userId, updates);
      if (error) {
        return { error };
      }

      if (Object.keys(applied).length > 0) {
        setUserState((prev) =>
          prev ? { ...prev, settings: { ...prev.settings, ...applied } } : prev
        );
      }

      return { error: null };
    },
    [userId]
  );

  const deleteAccount = useCallback(async () => {
    if (!userId) {
      return { error: strings.common.notSignedIn };
    }

    const { error } = await supabase.rpc('delete_own_account');
    if (error) {
      return { error: error.message };
    }

    await supabase.auth.signOut();
    await resetEncryption();
    setUserState(null);
    return { error: null };
  }, [userId, resetEncryption]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      isAuthenticating,
      signIn,
      signUp,
      logout,
      updateProfile,
      deleteAccount,
    }),
    [user, loading, isAuthenticating, signIn, signUp, logout, updateProfile, deleteAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
