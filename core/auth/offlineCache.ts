import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/shared/lib/logger';

/**
 * Lets the native app sign in and unlock without a connection.
 *
 * What is cached is exactly what the server already stores for the account: the profile row
 * (settings + the password-wrapped DEK material: salt, encrypted DEK, IV, iterations). It is
 * useless without the password, and the password is verified offline the same way as online:
 * by unwrapping the DEK (AES-GCM fails on a wrong password). Nothing here is a secret.
 * On web it lives in localStorage (via AsyncStorage), next to the Supabase session.
 */

const PROFILE_KEY = (userId: string) => `flowtodo_profile_row_v1:${userId}`;
const ACCOUNT_KEY = (email: string) => `flowtodo_account_v1:${normalizeEmail(email)}`;
const LAST_USER_KEY = 'flowtodo_last_user_v1';

export interface LastUser {
  id: string;
  email: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function write(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    logger.warn('Offline cache write failed:', (err as Error)?.message ?? err);
  }
}

async function read<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    logger.warn('Offline cache read failed:', (err as Error)?.message ?? err);
    return null;
  }
}

export const cacheProfileRow = (userId: string, row: unknown) => write(PROFILE_KEY(userId), row);

export const loadCachedProfileRow = <T>(userId: string) => read<T>(PROFILE_KEY(userId));

/** Remembers which account an email belongs to, so an offline sign-in can find its cached row. */
export const rememberAccount = (email: string, userId: string) => write(ACCOUNT_KEY(email), userId);

export const userIdForEmail = (email: string) => read<string>(ACCOUNT_KEY(email));

/** The account that had a session when the app last ran; cleared on logout. */
export const rememberLastUser = (user: LastUser) => write(LAST_USER_KEY, user);

export const loadLastUser = () => read<LastUser>(LAST_USER_KEY);

export async function clearLastUser() {
  await AsyncStorage.removeItem(LAST_USER_KEY).catch(() => {});
}

/** Removes everything cached for an account (account deletion). */
export async function forgetAccount(userId: string, email: string) {
  await AsyncStorage.multiRemove([PROFILE_KEY(userId), ACCOUNT_KEY(email), LAST_USER_KEY]).catch(
    () => {}
  );
}
