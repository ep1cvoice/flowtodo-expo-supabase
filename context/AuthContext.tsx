import { createContext, useContext, useEffect, useState } from 'react';
import { clampFilterLimit } from '@/constants/filterLimits';
import { AUTH_BOOTSTRAP_TIMEOUT_MS } from '@/lib/auth/constants';
import { resolveDekFromPassword } from '@/lib/auth/dek';
import { fetchProfile, minimalUserFromSession, toProfileRow } from '@/lib/auth/profile';
import { rewrapDekAndUpdatePassword } from '@/lib/auth/updatePassword';
import { toastForError } from '@/lib/networkError';
import { pausePomodoroBeforeLogout } from '@/lib/pomodoroLogoutBridge';
import { withTimeout } from '@/lib/withTimeout';
import { supabase } from '@/supabase/client';
import type { AuthContextValue, ProfileUpdates } from '@/types';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);
  const [dek, setDek] = useState<Uint8Array | null>(null);
  // Zapobiega migotnięciu UnlockGate w oknie między ustawieniem `user`
  // (przez onAuthStateChange) a ustawieniem `dek` (w signIn/unlock) —
  // te dwa stany aktualizują się z różnych, niepowiązanych źródeł asynchronicznych.
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
        console.warn('Session bootstrap failed:', (err as Error)?.message ?? err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          const profile =
            (await fetchProfile(session.user.id, session.user.email)) ??
            minimalUserFromSession(session.user.id, session.user.email);
          if (isMounted) setUserState(profile);
        } else {
          if (isMounted) {
            setUserState(null);
            setDek(null);
          }
        }
      } catch (err) {
        console.warn('onAuthStateChange profile load failed:', (err as Error)?.message ?? err);
        if (session?.user && isMounted) {
          setUserState(minimalUserFromSession(session.user.id, session.user.email));
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsAuthenticating(true);
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        AUTH_BOOTSTRAP_TIMEOUT_MS,
        'signIn'
      );

      if (error || !data.user) {
        return { error: error?.message ?? 'Sign in failed' };
      }

      const resolved = await resolveDekFromPassword({
        userId: data.user.id,
        password,
        profileTimeoutLabel: 'signInProfile',
        decryptFailLog: 'Failed to decrypt DEK:',
        decryptFailError: 'Nieprawidłowe hasło lub uszkodzone dane szyfrowania',
      });
      if (!resolved.ok) return { error: resolved.error };

      setDek(resolved.dek);
      return { error: null };
    } catch (err) {
      console.warn('signIn failed:', (err as Error)?.message ?? err);
      return { error: toastForError(err, 'Sign in failed') };
    } finally {
      setIsAuthenticating(false);
    }
  };

  const unlock = async (password: string) => {
    if (!user?.id || !user?.email) {
      return { error: 'Brak aktywnej sesji.' };
    }

    setIsAuthenticating(true);
    try {
      const resolved = await resolveDekFromPassword({
        userId: user.id,
        password,
        verifyEmail: user.email,
        profileTimeoutLabel: 'unlockProfile',
        decryptFailLog: 'Failed to unlock DEK:',
        decryptFailError: 'Nieprawidłowe hasło',
      });
      if (!resolved.ok) return { error: resolved.error };

      setDek(resolved.dek);
      return { error: null };
    } catch (err) {
      console.warn('unlock failed:', (err as Error)?.message ?? err);
      return { error: toastForError(err, 'Nie udało się odblokować') };
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
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
      console.error('Nieoczekiwany błąd signUp:', unexpectedError);
      return { error: 'Nieoczekiwany błąd podczas rejestracji.' };
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    await pausePomodoroBeforeLogout();
    await supabase.auth.signOut();
    setDek(null); // clear DEK from memory after logout
  };

  const updateProfile = async (updates: ProfileUpdates) => {
    if (!user) {
      return { error: 'Not signed in' };
    }

    const row = toProfileRow(updates);
    if (Object.keys(row).length === 0) {
      return { error: null };
    }

    const { error } = await supabase.from('profiles').update(row).eq('id', user.id);
    if (error) {
      return { error: error.message };
    }

    const nextSettings: ProfileUpdates = { ...updates };
    if (updates.maxFilterSelections !== undefined) {
      nextSettings.maxFilterSelections = clampFilterLimit(updates.maxFilterSelections);
    }

    setUserState((prev) =>
      prev
        ? {
            ...prev,
            settings: {
              ...prev.settings,
              ...nextSettings,
            },
          }
        : prev
    );

    return { error: null };
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!user?.email) {
      return { error: 'Please sign in to update your password.' };
    }

    if (!dek) {
      return { error: 'Brak odszyfrowanego klucza. Zaloguj się ponownie przed zmianą hasła.' };
    }

    return rewrapDekAndUpdatePassword({
      userId: user.id,
      email: user.email,
      dek,
      currentPassword,
      newPassword,
    });
  };

  const deleteAccount = async () => {
    if (!user) {
      return { error: 'Not signed in' };
    }

    const { error } = await supabase.rpc('delete_own_account');
    if (error) {
      return { error: error.message };
    }

    await supabase.auth.signOut();
    setUserState(null);
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        dek,
        loading,
        isAuthenticating,
        signIn,
        signUp,
        logout,
        unlock,
        updateProfile,
        updatePassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
