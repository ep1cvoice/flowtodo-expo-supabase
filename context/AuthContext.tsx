import { createContext, useContext, useEffect, useState } from 'react';
import {
  clampFilterLimit,
  FILTER_LIMIT_DEFAULT,
} from '@/constants/filterLimits';

import { supabase } from '@/supabase/client';
import { generateEncryptionMaterial, encryptDekWithPassword, decryptDek } from '@/lib/crypto';
import { pausePomodoroBeforeLogout } from '@/lib/pomodoroLogoutBridge';
import { withRetry } from '@/lib/retry';
import { migrateUserEncryption } from '@/lib/migrateEncryption';

import type { AuthContextValue, ProfileUpdates, User } from '@/types';

const AuthContext = createContext<AuthContextValue | null>(null);

const PROFILE_RETRY_ATTEMPTS = 3;
const PROFILE_RETRY_DELAY_MS = 500;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchProfile(
  userId: string,
  email: string | undefined,
  attempt = 1
): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'username, theme, notification_type, pomodoro_time, view, max_filter_selections'
    )
    .eq('id', userId)
    .single();

  if (error || !data) {
    if (attempt < PROFILE_RETRY_ATTEMPTS) {
      await wait(PROFILE_RETRY_DELAY_MS * attempt);
      return fetchProfile(userId, email, attempt + 1);
    }
    console.warn('fetchProfile failed after retries:', error?.message);
    return null;
  }

  return {
    id: userId,
    email: email ?? '',
    username: data.username ?? '',
    settings: {
      theme: data.theme ?? undefined,
      notificationType: data.notification_type ?? undefined,
      pomodoroTime: data.pomodoro_time != null ? Number(data.pomodoro_time) : undefined,
      view: data.view ?? undefined,
      maxFilterSelections:
        data.max_filter_selections != null
          ? clampFilterLimit(Number(data.max_filter_selections))
          : FILTER_LIMIT_DEFAULT,
    },
  };
}

function toProfileRow(updates: ProfileUpdates) {
  const row: {
    theme?: string;
    notification_type?: string;
    pomodoro_time?: number;
    view?: string;
    max_filter_selections?: number;
  } = {};

  if (updates.theme !== undefined) row.theme = updates.theme;
  if (updates.notificationType !== undefined) row.notification_type = updates.notificationType;
  if (updates.pomodoroTime !== undefined) row.pomodoro_time = updates.pomodoroTime;
  if (updates.view !== undefined) row.view = updates.view;
  if (updates.maxFilterSelections !== undefined) {
    row.max_filter_selections = clampFilterLimit(updates.maxFilterSelections);
  }

  return row;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dek, setDek] = useState<Uint8Array | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email);
        if (isMounted) setUserState(profile);
      }
      if (isMounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email);
        if (isMounted) setUserState(profile);
      } else {
        if (isMounted) setUserState(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);


  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return { error: error?.message ?? 'Sign in failed' };
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('salt, encrypted_dek, dek_iv')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profileData) {
      return { error: 'Nie udało się pobrać danych szyfrowania profilu' };
    }

    const { salt, encrypted_dek, dek_iv } = profileData;
    if (!salt || !encrypted_dek || !dek_iv) {
      return { error: 'Profil nie ma skonfigurowanego szyfrowania. Skontaktuj się z pomocą.' };
    }

    try {
      const decryptedDek = decryptDek(password, salt, encrypted_dek, dek_iv);
      setDek(decryptedDek);
      void migrateUserEncryption(data.user.id, decryptedDek).catch((err) =>
        console.warn('Background encryption migration failed:', err)
      );
    } catch (err) {
      console.warn('Failed to decrypt DEK:', err);
      return { error: 'Nieprawidłowe hasło lub uszkodzone dane szyfrowania' };
      }

    return { error: null };
  };

  const unlock = async (password: string) => {
    if (!user?.id) {
      return { error: 'Brak aktywnej sesji.' };
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('salt, encrypted_dek, dek_iv')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData) {
      return { error: 'Nie udało się pobrać danych szyfrowania profilu' };
    }

    const { salt, encrypted_dek, dek_iv } = profileData;
    if (!salt || !encrypted_dek || !dek_iv) {
      return { error: 'Profil nie ma skonfigurowanego szyfrowania. Skontaktuj się z pomocą.' };
    }

    try {
      const decryptedDek = decryptDek(password, salt, encrypted_dek, dek_iv);
      setDek(decryptedDek);
      void migrateUserEncryption(user.id, decryptedDek).catch((err) =>
        console.warn('Background encryption migration failed:', err)
      );
    } catch (err) {
      console.warn('Failed to unlock DEK:', err);
      return { error: 'Nieprawidłowe hasło' };
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (error || !data.user) {
      return { error: error?.message ?? 'Sign up failed' };
    }

    const { salt, encryptedDek, dekIv } = await generateEncryptionMaterial(password);

    try {
      await withRetry(
        async () => {
          const { error: updateError, data: updated } = await supabase
            .from('profiles')
            .update({ salt, encrypted_dek: encryptedDek, dek_iv: dekIv })
            .eq('id', data.user!.id)
            .select('id');

          if (updateError) throw updateError;
          if (!updated || updated.length === 0) throw new Error('Profile row not ready yet');
        },
        { attempts: PROFILE_RETRY_ATTEMPTS, delayMs: PROFILE_RETRY_DELAY_MS }
      );
    } catch (err) {
      console.warn('Failed to save encryption material after retries:', err);
      return {
        error:
          'Konto utworzone, ale nie udało się zapisać kluczy szyfrowania. Spróbuj zalogować się ponownie.',
      };
    }

    return { error: null };
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

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) {
      return { error: 'Current password is incorrect' };
    }

    // Pobierz obecne salt/encrypted_dek/dek_iv, żeby mieć co zbackupować
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('salt, encrypted_dek, dek_iv')
      .eq('id', user.id)
      .single();

    if (fetchError || !currentProfile?.salt || !currentProfile?.encrypted_dek || !currentProfile?.dek_iv) {
      return { error: 'Nie udało się odczytać obecnych danych szyfrowania.' };
    }

    const { salt, encryptedDek, dekIv } = await encryptDekWithPassword(dek, newPassword);

    // Zapisz nowe wartości + backup starych w jednym update
    try {
      await withRetry(
        async () => {
          const { error: updateError, data: updated } = await supabase
            .from('profiles')
            .update({
              salt,
              encrypted_dek: encryptedDek,
              dek_iv: dekIv,
              salt_backup: currentProfile.salt,
              encrypted_dek_backup: currentProfile.encrypted_dek,
              dek_iv_backup: currentProfile.dek_iv,
            })
            .eq('id', user.id)
            .select('id');

          if (updateError) throw updateError;
          if (!updated || updated.length === 0) throw new Error('Profile row not ready yet');
        },
        { attempts: PROFILE_RETRY_ATTEMPTS, delayMs: PROFILE_RETRY_DELAY_MS }
      );
    } catch (err) {
      console.warn('Failed to re-encrypt DEK:', err);
      return { error: 'Nie udało się zaktualizować szyfrowania. Hasło NIE zostało zmienione — spróbuj ponownie.' };
    }

    // Zmień hasło w Supabase Auth
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      // Auth się nie zmieniło — przywróć stare salt/encrypted_dek/dek_iv z backupu,
      // żeby stary DEK dalej dawał się odszyfrować starym hasłem
      console.error('Auth password update failed, rolling back encrypted_dek:', error);

      try {
        await withRetry(
          async () => {
            const { error: rollbackError } = await supabase
              .from('profiles')
              .update({
                salt: currentProfile.salt,
                encrypted_dek: currentProfile.encrypted_dek,
                dek_iv: currentProfile.dek_iv,
                salt_backup: null,
                encrypted_dek_backup: null,
                dek_iv_backup: null,
              })
              .eq('id', user.id);

            if (rollbackError) throw rollbackError;
          },
          { attempts: PROFILE_RETRY_ATTEMPTS, delayMs: PROFILE_RETRY_DELAY_MS }
        );
      } catch (rollbackErr) {
        // Najgorszy scenariusz: rollback też zawiódł. Backup w bazie zostaje
        // to pozwoli na ręczne odzyskanie danych po stronie admina, ale user jest zablokowany.
        console.error('CRITICAL: rollback of encrypted_dek also failed:', rollbackErr);
        return {
          error:
            'Krytyczny błąd zmiany hasła. Skontaktuj się z pomocą — Twoje dane są bezpieczne, ale wymagają ręcznego odzyskania.',
        };
      }

      return { error: 'Błąd podczas zmiany hasła. Spróbuj ponownie.' };
    }

    // Sukces wyczyść backup, nie jest już potrzebny
    await supabase
      .from('profiles')
      .update({ salt_backup: null, encrypted_dek_backup: null, dek_iv_backup: null })
      .eq('id', user.id);

    return { error: null };
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
