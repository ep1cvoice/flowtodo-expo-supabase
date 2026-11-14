import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/core/auth/AuthContext';
import { EncryptionProvider, useEncryption } from '@/core/auth/EncryptionContext';

import { supabase } from '@/core/supabase/client';
import { resolveDekFromPassword } from '@/core/auth/dek';
import { fetchProfile, loadCachedUser, minimalUserFromSession } from '@/core/auth/profile';
import {
  clearDekFromSecureStore,
  hasStoredDek,
  loadDekFromSecureStore,
  saveDekToSecureStore,
} from '@/core/auth/secureStorage';
import * as offlineCache from '@/core/auth/offlineCache';
import { pausePomodoroBeforeLogout } from '@/features/pomodoro/lib/pomodoroLogoutBridge';

let mockAuthCallback: ((event: string, session: unknown) => Promise<void>) | null = null;

jest.mock('@/core/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
    },
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));
jest.mock('@/core/auth/constants', () => ({ AUTH_BOOTSTRAP_TIMEOUT_MS: 1000 }));
jest.mock('@/shared/lib/withTimeout', () => ({ withTimeout: (p: Promise<unknown>) => p }));
jest.mock('@/core/auth/dek', () => ({ resolveDekFromPassword: jest.fn() }));
jest.mock('@/core/auth/profile', () => ({
  fetchProfile: jest.fn(),
  loadCachedUser: jest.fn(),
  minimalUserFromSession: jest.fn(),
  updateProfileSettings: jest.fn(),
}));
jest.mock('@/core/auth/updatePassword', () => ({ rewrapDekAndUpdatePassword: jest.fn() }));
jest.mock('@/core/auth/secureStorage', () => ({
  hasStoredDek: jest.fn(),
  loadDekFromSecureStore: jest.fn(),
  saveDekToSecureStore: jest.fn(),
  clearDekFromSecureStore: jest.fn(),
}));
let mockReconnect: (() => void) | null = null;
jest.mock('@/shared/providers/NetworkContext', () => ({
  useOnReconnect: (cb: () => void) => {
    mockReconnect = cb;
  },
}));
let mockOnlineNow = true;
jest.mock('@/shared/lib/netState', () => ({ isOnlineNow: async () => mockOnlineNow }));
jest.mock('@/core/auth/offlineCache', () => ({
  clearLastUser: jest.fn(),
  forgetAccount: jest.fn(),
  loadLastUser: jest.fn(),
  rememberAccount: jest.fn(),
  rememberLastUser: jest.fn(),
  userIdForEmail: jest.fn(),
}));
jest.mock('@/features/pomodoro/lib/pomodoroLogoutBridge', () => ({
  pausePomodoroBeforeLogout: jest.fn(),
}));

const auth = supabase.auth as any;
const resolveDek = resolveDekFromPassword as jest.Mock;
const clearStoredDek = clearDekFromSecureStore as jest.Mock;
const saveStoredDek = saveDekToSecureStore as jest.Mock;
const loadStoredDek = loadDekFromSecureStore as jest.Mock;

const dek = new Uint8Array(32).fill(1);
const profile = { id: 'u1', email: 'a@b.com' };
const session = { user: { id: 'u1', email: 'a@b.com' } };

const wrapper = ({ children }: { children: ReactNode }) => (
  <EncryptionProvider>
    <AuthProvider>{children}</AuthProvider>
  </EncryptionProvider>
);

function useAuthAndEncryption() {
  const auth = useAuth();
  const enc = useEncryption();
  return { ...auth, ...enc, unlock: (password: string) => enc.unlock(password, auth.user) };
}

async function renderAuth(currentSession: unknown = null) {
  auth.getSession.mockResolvedValue({ data: { session: currentSession } });
  const hook = await renderHook(() => useAuthAndEncryption(), { wrapper });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

async function signInAs(result: { current: ReturnType<typeof useAuthAndEncryption> }) {
  auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  resolveDek.mockResolvedValue({ ok: true, dek });
  await act(async () => {
    await result.current.signIn('a@b.com', 'pw');
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockOnlineNow = true;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockAuthCallback = null;

  (hasStoredDek as jest.Mock).mockResolvedValue(false);
  (fetchProfile as jest.Mock).mockResolvedValue(profile);
  (minimalUserFromSession as jest.Mock).mockImplementation((id: string, email: string) => ({ id, email }));
  auth.onAuthStateChange.mockImplementation((cb: any) => {
    mockAuthCallback = cb;
    return { data: { subscription: { unsubscribe: jest.fn() } } };
  });
  auth.signOut.mockResolvedValue({ error: null });
  clearStoredDek.mockResolvedValue(undefined);
  saveStoredDek.mockResolvedValue(undefined);
  (pausePomodoroBeforeLogout as jest.Mock).mockResolvedValue(undefined);
});

describe('session bootstrap', () => {
  it('without a session: not authenticated and no DEK', async () => {
    const { result } = await renderAuth(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.dek).toBeNull();
  });

  it('with a session: user is loaded but the app stays locked (no DEK)', async () => {
    const { result } = await renderAuth(session);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(profile);
    expect(result.current.dek).toBeNull();
  });

  it('reports whether a biometric-unlock DEK is stored on this device', async () => {
    (hasStoredDek as jest.Mock).mockResolvedValue(true);
    const { result } = await renderAuth(null);
    expect(result.current.biometricUnlockAvailable).toBe(true);
  });
});

describe('onAuthStateChange', () => {
  it('ignores TOKEN_REFRESHED: no profile fetch and no new user object', async () => {
    const { result } = await renderAuth(session);
    const before = result.current.user;
    (fetchProfile as jest.Mock).mockClear();

    await act(async () => {
      mockAuthCallback!('TOKEN_REFRESHED', session);
      await new Promise((r) => setTimeout(r, 5));
    });

    expect(fetchProfile).not.toHaveBeenCalled();
    expect(result.current.user).toBe(before);
  });

  it('loads the profile on SIGNED_IN, deferred out of the callback', async () => {
    const { result } = await renderAuth(null);
    (fetchProfile as jest.Mock).mockClear();

    await act(async () => {
      mockAuthCallback!('SIGNED_IN', session);
    });
    expect(fetchProfile).not.toHaveBeenCalled();

    await waitFor(() => expect(result.current.user).toEqual(profile));
    expect(fetchProfile).toHaveBeenCalledWith('u1', 'a@b.com');
  });
});

describe('signIn', () => {
  it('keeps the DEK in memory only, without silently saving it to secure storage', async () => {
    const { result } = await renderAuth(null);
    auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    resolveDek.mockResolvedValue({ ok: true, dek });

    let res: any;
    await act(async () => {
      res = await result.current.signIn('a@b.com', 'pw');
    });

    expect(res).toEqual({ error: null });
    expect(result.current.dek).toBe(dek);
    expect(resolveDek).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', password: 'pw' }));
    expect(saveStoredDek).not.toHaveBeenCalled();
    expect(result.current.isAuthenticating).toBe(false);
  });

  it('returns the Auth error and never derives a DEK when credentials are rejected', async () => {
    const { result } = await renderAuth(null);
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    let res: any;
    await act(async () => {
      res = await result.current.signIn('a@b.com', 'wrong');
    });

    expect(res).toEqual({ error: 'Invalid login credentials' });
    expect(resolveDek).not.toHaveBeenCalled();
    expect(result.current.dek).toBeNull();
  });

  it('signs out again and returns the error when the DEK cannot be resolved', async () => {
    const { result } = await renderAuth(null);
    auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    resolveDek.mockResolvedValue({ ok: false, error: 'Invalid password or corrupted encryption data' });

    let res: any;
    await act(async () => {
      res = await result.current.signIn('a@b.com', 'pw');
    });

    expect(res).toEqual({ error: 'Invalid password or corrupted encryption data' });
    expect(auth.signOut).toHaveBeenCalled();
    expect(result.current.dek).toBeNull();
  });

  it('resets isAuthenticating even when signIn throws', async () => {
    const { result } = await renderAuth(null);
    auth.signInWithPassword.mockRejectedValue(new Error('boom'));

    let res: any;
    await act(async () => {
      res = await result.current.signIn('a@b.com', 'pw');
    });

    expect(res.error).toBeTruthy();
    expect(result.current.isAuthenticating).toBe(false);
  });
});

describe('unlock', () => {
  it('fails without an active session and does not touch the DEK', async () => {
    const { result } = await renderAuth(null);

    let res: any;
    await act(async () => {
      res = await result.current.unlock('pw');
    });

    expect(res.error).toBeTruthy();
    expect(resolveDek).not.toHaveBeenCalled();
    expect(result.current.dek).toBeNull();
  });

  it('sets the DEK after a correct password and verifies it against the account email', async () => {
    const { result } = await renderAuth(session);
    resolveDek.mockResolvedValue({ ok: true, dek });

    let res: any;
    await act(async () => {
      res = await result.current.unlock('pw');
    });

    expect(res).toEqual({ error: null });
    expect(result.current.dek).toBe(dek);
    expect(resolveDek).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', verifyEmail: 'a@b.com', password: 'pw' })
    );
  });

  it('keeps the app locked after a wrong password', async () => {
    const { result } = await renderAuth(session);
    resolveDek.mockResolvedValue({ ok: false, error: 'Invalid password' });

    let res: any;
    await act(async () => {
      res = await result.current.unlock('wrong');
    });

    expect(res).toEqual({ error: 'Invalid password' });
    expect(result.current.dek).toBeNull();
  });
});

describe('unlockWithBiometrics', () => {
  it('sets the stored DEK', async () => {
    const { result } = await renderAuth(session);
    loadStoredDek.mockResolvedValue(dek);

    let res: any;
    await act(async () => {
      res = await result.current.unlockWithBiometrics();
    });

    expect(res).toEqual({ error: null });
    expect(result.current.dek).toBe(dek);
  });

  it('returns an error and stays locked when nothing is stored', async () => {
    const { result } = await renderAuth(session);
    loadStoredDek.mockResolvedValue(null);

    let res: any;
    await act(async () => {
      res = await result.current.unlockWithBiometrics();
    });

    expect(res.error).toBeTruthy();
    expect(result.current.dek).toBeNull();
  });

  it('returns an error and stays locked when the prompt is cancelled', async () => {
    const { result } = await renderAuth(session);
    loadStoredDek.mockRejectedValue(new Error('user cancelled'));

    let res: any;
    await act(async () => {
      res = await result.current.unlockWithBiometrics();
    });

    expect(res.error).toBeTruthy();
    expect(result.current.dek).toBeNull();
  });
});

describe('enableBiometricUnlock / disableBiometricUnlock', () => {
  it('refuses to save anything when there is no DEK in memory', async () => {
    const { result } = await renderAuth(session);

    let res: any;
    await act(async () => {
      res = await result.current.enableBiometricUnlock();
    });

    expect(res.error).toBeTruthy();
    expect(saveStoredDek).not.toHaveBeenCalled();
  });

  it('saves the in-memory DEK and marks biometric unlock as available', async () => {
    const { result } = await renderAuth(null);
    await signInAs(result);

    let res: any;
    await act(async () => {
      res = await result.current.enableBiometricUnlock();
    });

    expect(res).toEqual({ error: null });
    expect(saveStoredDek).toHaveBeenCalledWith(dek);
    expect(result.current.biometricUnlockAvailable).toBe(true);
  });

  it('disabling wipes the stored DEK', async () => {
    (hasStoredDek as jest.Mock).mockResolvedValue(true);
    const { result } = await renderAuth(null);

    await act(async () => {
      await result.current.disableBiometricUnlock();
    });

    expect(clearStoredDek).toHaveBeenCalled();
    expect(result.current.biometricUnlockAvailable).toBe(false);
  });
});

describe('DEK is cleared', () => {
  it('on logout: memory, secure storage and the Supabase session', async () => {
    (hasStoredDek as jest.Mock).mockResolvedValue(true);
    const { result } = await renderAuth(null);
    await signInAs(result);
    expect(result.current.dek).toBe(dek);

    await act(async () => {
      await result.current.logout();
    });

    expect(pausePomodoroBeforeLogout).toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalled();
    expect(clearStoredDek).toHaveBeenCalled();
    expect(result.current.dek).toBeNull();
    expect(result.current.biometricUnlockAvailable).toBe(false);
  });

  it('on logout even when signOut throws (DEK must not survive in memory or secure storage)', async () => {
    (hasStoredDek as jest.Mock).mockResolvedValue(true);
    const { result } = await renderAuth(null);
    await signInAs(result);
    auth.signOut.mockRejectedValue(new Error('network down'));

    await act(async () => {
      await result.current.logout().catch(() => {});
    });

    expect(clearStoredDek).toHaveBeenCalled();
    expect(result.current.dek).toBeNull();
  });

  it('when Supabase reports the session ended (auth state change with no session)', async () => {
    const { result } = await renderAuth(session);
    await signInAs(result);
    expect(result.current.dek).toBe(dek);

    await act(async () => {
      await mockAuthCallback!('SIGNED_OUT', null);
    });

    expect(result.current.dek).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('on account deletion', async () => {
    const { result } = await renderAuth(session);
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

    let res: any;
    await act(async () => {
      res = await result.current.deleteAccount();
    });

    expect(res).toEqual({ error: null });
    expect(supabase.rpc).toHaveBeenCalledWith('delete_own_account');
    expect(clearStoredDek).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });
});


describe('offline', () => {
  const offlineError = { message: 'Network request failed', status: 0 };
  const cache = offlineCache as unknown as Record<string, jest.Mock>;

  beforeEach(() => {
    mockReconnect = null;
    Object.values(cache)
      .filter((fn) => jest.isMockFunction(fn))
      .forEach((fn) => fn.mockResolvedValue(null));
  });

  it('opens on the cached account immediately, without waiting for the network', async () => {
    cache.loadLastUser.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    (loadCachedUser as jest.Mock).mockResolvedValue({ id: 'u1', email: 'a@b.com', cached: true });
    // The session check never answers (dead connection) and must not block startup.
    auth.getSession.mockReturnValue(new Promise(() => {}));

    const hook = await renderHook(() => useAuthAndEncryption(), { wrapper });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));

    expect(hook.result.current.user).toMatchObject({ id: 'u1', cached: true });
    expect(fetchProfile).not.toHaveBeenCalled();
    expect(hook.result.current.dek).toBeNull(); // still locked: the DEK needs the password

    // supabase-js reports INITIAL_SESSION with no session; that must not sign the user out.
    await act(async () => {
      await mockAuthCallback!('INITIAL_SESSION', null);
    });
    expect(hook.result.current.user).toMatchObject({ id: 'u1' });
  });

  it('keeps the cached account when the background session check fails with a network error', async () => {
    cache.loadLastUser.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    (loadCachedUser as jest.Mock).mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    auth.getSession.mockResolvedValue({ data: { session: null }, error: offlineError });

    const hook = await renderHook(() => useAuthAndEncryption(), { wrapper });
    await waitFor(() => expect(auth.getSession).toHaveBeenCalled());
    await act(async () => {});

    expect(hook.result.current.user).toMatchObject({ id: 'u1' });
  });

  it('signs out of the cached account when the background check finds no session', async () => {
    cache.loadLastUser.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    (loadCachedUser as jest.Mock).mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const hook = await renderHook(() => useAuthAndEncryption(), { wrapper });
    await waitFor(() => expect(hook.result.current.user).toBeNull());
  });

  it('refreshes the profile once the background check confirms the session', async () => {
    cache.loadLastUser.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    (loadCachedUser as jest.Mock).mockResolvedValue({ id: 'u1', email: 'a@b.com', cached: true });
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    (fetchProfile as jest.Mock).mockResolvedValue({ id: 'u1', email: 'a@b.com', fresh: true });

    const hook = await renderHook(() => useAuthAndEncryption(), { wrapper });
    await waitFor(() => expect(hook.result.current.user).toMatchObject({ fresh: true }));
  });

  it('stays signed out when there is no cached account', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: offlineError });
    const { result } = await renderAuth(null);
    expect(result.current.user).toBeNull();
  });

  it('signs in offline with the cached DEK material and restores the session when back online', async () => {
    const { result } = await renderAuth(null);
    auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: offlineError });
    cache.userIdForEmail.mockResolvedValue('u1');
    resolveDek.mockResolvedValue({ ok: true, dek });
    (loadCachedUser as jest.Mock).mockResolvedValue({ id: 'u1', email: 'a@b.com' });

    let outcome: { error: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.signIn('a@b.com', 'pw');
    });

    expect(fetchProfile).not.toHaveBeenCalled();
    expect(outcome).toEqual({ error: null });
    expect(resolveDek).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', password: 'pw' }));
    expect(result.current.user).toMatchObject({ id: 'u1' });
    expect(result.current.dek).toBe(dek);

    auth.signInWithPassword.mockClear().mockResolvedValue({ data: {}, error: null });
    await act(async () => {
      mockReconnect!();
    });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });

    // Credentials are dropped after success: a second reconnect does not sign in again.
    auth.signInWithPassword.mockClear();
    await act(async () => {
      mockReconnect!();
    });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('rejects an offline sign-in for an account never signed in on this device', async () => {
    const { result } = await renderAuth(null);
    auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: offlineError });
    cache.userIdForEmail.mockResolvedValue(null);

    let outcome: { error: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.signIn('a@b.com', 'pw');
    });

    expect(outcome?.error).toMatch(/internet/i);
    expect(result.current.user).toBeNull();
    expect(resolveDek).not.toHaveBeenCalled();
  });

  it('rejects a wrong password offline', async () => {
    const { result } = await renderAuth(null);
    auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: offlineError });
    cache.userIdForEmail.mockResolvedValue('u1');
    resolveDek.mockResolvedValue({ ok: false, error: 'bad password' });

    let outcome: { error: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.signIn('a@b.com', 'nope');
    });

    expect(outcome).toEqual({ error: 'bad password' });
    expect(result.current.user).toBeNull();
    expect(result.current.dek).toBeNull();
  });
});
