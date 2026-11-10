import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { isWeb } from '@/shared/lib/platform';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/** Expo web static/SSR runs in Node — no `window`. Native is fine. */
const isWebSsr = isWeb && typeof window === 'undefined';

const authStorage: SupportedStorage = {
  getItem: (key) => {
    if (isWebSsr) return Promise.resolve(null);
    return AsyncStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (isWebSsr) return Promise.resolve();
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (isWebSsr) return Promise.resolve();
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: !isWebSsr,
    persistSession: !isWebSsr,
    detectSessionInUrl: false,
  },
});

/**
 * Supabase recommended pattern for React Native: refresh tokens only while the
 * app is in the foreground, and resume as soon as it becomes active again.
 */
if (!isWebSsr) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
