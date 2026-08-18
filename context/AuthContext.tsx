import { createContext, useContext, useEffect, useState } from 'react';
import {
  clampFilterLimit,
  FILTER_LIMIT_DEFAULT,
} from '@/constants/filterLimits';
import { pausePomodoroBeforeLogout } from '@/lib/pomodoroLogoutBridge';
import { supabase } from '@/supabase/client';
import { withRetry } from '@/lib/retry';
import { generateEncryptionMaterial } from '@/lib/crypto';

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
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

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) {
      return { error: 'Current password is incorrect' };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { error: error.message };
    }

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
        loading,
        signIn,
        signUp,
        logout,
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
