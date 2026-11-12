import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/core/auth/AuthContext';
import {
  resolveColors,
  type AppColors,
  type ThemeMode,
} from '@/shared/constants/theme';
import { logger } from '@/shared/lib/logger';

const STORAGE_KEY = 'flowtodo.theme';
const COMPACT_STORAGE_KEY = 'flowtodo.compact';

function isThemeMode(value: string | undefined): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'auto';
}

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => Promise<{ error: string | null }>;
  colors: AppColors;
  isDark: boolean;
  ready: boolean;
  compact: boolean;
  setCompact: (compact: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, updateProfile } = useAuth();
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('auto');
  const [ready, setReady] = useState(false);
  const [compact, setCompactState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (isThemeMode(stored ?? undefined)) {
          setThemeState(stored as ThemeMode);
        }
      })
      .finally(() => setReady(true));
  }, []);

  // Compact view is a per-device display preference, so it is stored locally only.
  useEffect(() => {
    AsyncStorage.getItem(COMPACT_STORAGE_KEY)
      .then((stored) => setCompactState(stored === 'true'))
      .catch(() => {});
  }, []);

  const setCompact = useCallback((next: boolean) => {
    setCompactState(next);
    AsyncStorage.setItem(COMPACT_STORAGE_KEY, String(next)).catch(() => {});
  }, []);

  // Prefer profile theme once auth loads (keeps devices in sync).
  useEffect(() => {
    if (!ready) return;
    const profileTheme = user?.settings?.theme;
    if (!isThemeMode(profileTheme)) return;

    setThemeState((current) => {
      if (current === profileTheme) return current;
      AsyncStorage.setItem(STORAGE_KEY, profileTheme).catch(() => {});
      return profileTheme;
    });
  }, [ready, user?.id, user?.settings?.theme]);

  const setTheme = useCallback(
    async (next: ThemeMode) => {
      setThemeState(next);
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      if (!user) {
        return { error: null };
      }
      const { error } = await updateProfile({ theme: next });
      if (error) logger.warn('Failed to persist theme:', error);
      return { error };
    },
    [user, updateProfile]
  );

  const systemDark = systemScheme === 'dark';
  const colors = useMemo(() => resolveColors(theme, systemDark), [theme, systemDark]);
  const isDark = theme === 'dark' || (theme === 'auto' && systemDark);

  // Always mount children — returning null remounted AuthProvider and wiped the session.
  const value = useMemo(
    () => ({ theme, setTheme, colors, isDark, ready, compact, setCompact }),
    [theme, setTheme, colors, isDark, ready, compact, setCompact]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
