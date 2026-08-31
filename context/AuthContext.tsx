import { createContext, useContext, useEffect, useState } from 'react';
import { clampFilterLimit } from '@/constants/filterLimits';
import { AUTH_BOOTSTRAP_TIMEOUT_MS } from '@/lib/auth/constants';
import { resolveDekFromPassword } from '@/lib/auth/dek';
import { fetchProfile, minimalUserFromSession, toProfileRow } from '@/lib/auth/profile';
import { rewrapDekAndUpdatePassword } from '@/lib/auth/updatePassword';
import { toastForError } from '@/lib/networkError';
import { pausePomodoroBeforeLogout } from '@/lib/pomodoro/pomodoroLogoutBridge';
import { withTimeout } from '@/lib/withTimeout';
import { supabase } from '@/supabase/client';
import type { ProfileUpdates, User } from '@/types';
import {
  saveDekToSecureStoreTracked,
  loadDekFromSecureStore,
  clearDekFromSecureStoreTracked,
  hasStoredDek,
} from '@/lib/auth/secureStorage';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  dek: Uint8Array | null;
  loading: boolean;
  /** Whether a DEK is saved in the platform secure store for this device. */
  biometricUnlockAvailable: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateProfile: (updates: ProfileUpdates) => Promise<{ error: string | null }>;
  updatePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
  unlock: (password: string) => Promise<{ error: string | null }>;
  /** Try to unlock using the device's biometrics/PIN instead of the password. */
  unlockWithBiometrics: () => Promise<{ error: string | null }>;
  /** Explicit opt-in: persist the current in-memory DEK to secure storage. */
  enableBiometricUnlock: () => Promise<{ error: string | null }>;
  /** Explicit opt-out: wipe the persisted DEK from secure storage. */
  disableBiometricUnlock: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);
  const [dek, setDek] = useState<Uint8Array | null>(null);
  const [biometricUnlockAvailable, setBiometricUnlockAvailable] = useState(false);
  // Only true during signIn/signUp. Unlock must NOT set this — UnlockGate
  // shows the app when this is true so the login screen can stay mounted.
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const [{ data }, storedDek] = await Promise.all([
          withTimeout(supabase.auth.getSession(), AUTH_BOOTSTRAP_TIMEOUT_MS, 'getSession'),
          hasStoredDek(),
        ]);
        if (isMounted) setBiometricUnlockAvailable(storedDek);

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
        decryptFailError: 'Invalid password or corrupted encryption data',
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

    try {
      const resolved = await resolveDekFromPassword({
        userId: user.id,
        password,
        verifyEmail: user.email,
        profileTimeoutLabel: 'unlockProfile',
        decryptFailLog: 'Failed to unlock DEK:',
        decryptFailError: 'Invalid password',
      });
      if (!resolved.ok) return { error: resolved.error };

      setDek(resolved.dek);
      return { error: null };
    } catch (err) {
      console.warn('unlock failed:', (err as Error)?.message ?? err);
      return { error: toastForError(err, 'Nie udało się odblokować') };
    }
  };

  const unlockWithBiometrics = async () => {
    try {
      const storedDek = await loadDekFromSecureStore();
      if (!storedDek) {
        return { error: 'Odblokowanie biometryczne nie jest skonfigurowane na tym urządzeniu.' };
      }
      setDek(storedDek);
      return { error: null };
    } catch (err) {
      // User cancelled the prompt, auth failed, or hardware unavailable —
      // caller should fall back to showing the password unlock screen.
      console.warn('unlockWithBiometrics failed:', (err as Error)?.message ?? err);
      return { error: 'Uwierzytelnianie nie powiodło się. Użyj hasła.' };
    }
  };

  const enableBiometricUnlock = async () => {
    if (!dek) {
      return { error: 'Brak odszyfrowanego klucza. Odblokuj aplikację hasłem, aby to włączyć.' };
    }
    try {
      await saveDekToSecureStoreTracked(dek);
      setBiometricUnlockAvailable(true);
      return { error: null };
    } catch (err) {
      console.warn('enableBiometricUnlock failed:', (err as Error)?.message ?? err);
      return { error: 'Nie udało się zapisać klucza w bezpiecznym magazynie urządzenia.' };
    }
  };

  const disableBiometricUnlock = async () => {
    await clearDekFromSecureStoreTracked();
    setBiometricUnlockAvailable(false);
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
    // Ending the session invalidates the persisted DEK's usefulness too —
    // wipe it so a different account can't accidentally inherit it on
    // this device, and so re-login re-establishes it deliberately.
    await clearDekFromSecureStoreTracked();
    setBiometricUnlockAvailable(false);
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

    // The raw DEK bytes are unchanged by a password change (only the
    // password-derived wrapping key is re-derived and the DEK is
    // re-wrapped) — no need to touch the secure store here.
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
    await clearDekFromSecureStoreTracked();
    setBiometricUnlockAvailable(false);
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
        biometricUnlockAvailable,
        signIn,
        signUp,
        logout,
        unlock,
        unlockWithBiometrics,
        enableBiometricUnlock,
        disableBiometricUnlock,
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
