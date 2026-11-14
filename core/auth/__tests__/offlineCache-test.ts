import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cacheProfileRow,
  clearLastUser,
  forgetAccount,
  loadCachedProfileRow,
  loadLastUser,
  rememberAccount,
  rememberLastUser,
  userIdForEmail,
} from '@/core/auth/offlineCache';

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('round-trips the profile row and finds accounts by email, ignoring case and spaces', async () => {
  await cacheProfileRow('u1', { salt: 's' });
  await rememberAccount('  Ann@Example.com ', 'u1');

  expect(await loadCachedProfileRow('u1')).toEqual({ salt: 's' });
  expect(await userIdForEmail('ann@example.com')).toBe('u1');
  expect(await userIdForEmail('other@example.com')).toBeNull();
});

it('clearLastUser keeps the account cache so offline sign-in still works after logout', async () => {
  await rememberAccount('a@b.c', 'u1');
  await rememberLastUser({ id: 'u1', email: 'a@b.c' });
  await clearLastUser();

  expect(await loadLastUser()).toBeNull();
  expect(await userIdForEmail('a@b.c')).toBe('u1');
});

it('forgetAccount removes everything cached for the account', async () => {
  await cacheProfileRow('u1', { salt: 's' });
  await rememberAccount('a@b.c', 'u1');
  await rememberLastUser({ id: 'u1', email: 'a@b.c' });
  await forgetAccount('u1', 'a@b.c');

  expect(await loadCachedProfileRow('u1')).toBeNull();
  expect(await userIdForEmail('a@b.c')).toBeNull();
  expect(await loadLastUser()).toBeNull();
});
