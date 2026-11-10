// Characterization tests for EncryptionContext actions.
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { EncryptionProvider, useEncryption } from '@/core/auth/EncryptionContext';

jest.mock('@/core/auth/dek', () => ({ resolveDekFromPassword: jest.fn() }));
jest.mock('@/core/auth/updatePassword', () => ({ rewrapDekAndUpdatePassword: jest.fn() }));
jest.mock('@/core/auth/secureStorage', () => ({
  hasStoredDek: jest.fn(),
  loadDekFromSecureStore: jest.fn(),
  saveDekToSecureStore: jest.fn(),
  clearDekFromSecureStore: jest.fn(),
}));
jest.mock('@/shared/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { resolveDekFromPassword } from '@/core/auth/dek';
import { rewrapDekAndUpdatePassword } from '@/core/auth/updatePassword';
import {
  clearDekFromSecureStore,
  hasStoredDek,
  loadDekFromSecureStore,
  saveDekToSecureStore,
} from '@/core/auth/secureStorage';

const resolveDek = resolveDekFromPassword as jest.Mock;
const rewrap = rewrapDekAndUpdatePassword as jest.Mock;
const hasStored = hasStoredDek as jest.Mock;
const loadDek = loadDekFromSecureStore as jest.Mock;
const saveDek = saveDekToSecureStore as jest.Mock;
const clearDek = clearDekFromSecureStore as jest.Mock;

const dek = new Uint8Array(32).fill(7);
const user = { id: 'u1', email: 'a@b.c' };

const wrapper = ({ children }: { children: ReactNode }) => (
  <EncryptionProvider>{children}</EncryptionProvider>
);

async function setup(stored = false) {
  hasStored.mockResolvedValue(stored);
  const hook = await renderHook(() => useEncryption(), { wrapper });
  await waitFor(() => expect(hasStored).toHaveBeenCalled());
  return hook;
}

beforeEach(() => {
  jest.resetAllMocks();
});

it('reflects the stored-DEK flag on mount', async () => {
  const { result } = await setup(true);
  await waitFor(() => expect(result.current.biometricUnlockAvailable).toBe(true));
  expect(result.current.dek).toBeNull();
});

it('survives hasStoredDek failing', async () => {
  hasStored.mockRejectedValue(new Error('boom'));
  const { result } = await renderHook(() => useEncryption(), { wrapper });
  await waitFor(() => expect(hasStored).toHaveBeenCalled());
  expect(result.current.biometricUnlockAvailable).toBe(false);
});

it('setDek / clearDek change the in-memory DEK', async () => {
  const { result } = await setup();
  await act(async () => result.current.setDek(dek));
  expect(result.current.dek).toBe(dek);
  await act(async () => result.current.clearDek());
  expect(result.current.dek).toBeNull();
});

describe('unlock', () => {
  it('requires a user with id and email', async () => {
    const { result } = await setup();
    let res: any;
    await act(async () => {
      res = await result.current.unlock('pw', null);
    });
    expect(res.error).toEqual(expect.any(String));
    expect(resolveDek).not.toHaveBeenCalled();
  });

  it('sets the DEK on success', async () => {
    resolveDek.mockResolvedValue({ ok: true, dek });
    const { result } = await setup();
    let res: any;
    await act(async () => {
      res = await result.current.unlock('pw', user);
    });
    expect(res).toEqual({ error: null });
    expect(result.current.dek).toBe(dek);
    expect(resolveDek).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', password: 'pw', verifyEmail: 'a@b.c' })
    );
  });

  it('returns the resolver error without setting the DEK', async () => {
    resolveDek.mockResolvedValue({ ok: false, error: 'wrong password' });
    const { result } = await setup();
    let res: any;
    await act(async () => {
      res = await result.current.unlock('pw', user);
    });
    expect(res).toEqual({ error: 'wrong password' });
    expect(result.current.dek).toBeNull();
  });

  it('returns an error (does not throw) when the resolver throws', async () => {
    resolveDek.mockRejectedValue(new Error('network'));
    const { result } = await setup();
    let res: any;
    await act(async () => {
      res = await result.current.unlock('pw', user);
    });
    expect(res.error).toEqual(expect.any(String));
    expect(result.current.dek).toBeNull();
  });
});

describe('unlockWithBiometrics', () => {
  it('sets the stored DEK', async () => {
    loadDek.mockResolvedValue(dek);
    const { result } = await setup(true);
    let res: any;
    await act(async () => {
      res = await result.current.unlockWithBiometrics();
    });
    expect(res).toEqual({ error: null });
    expect(result.current.dek).toBe(dek);
  });

  it('errors when nothing is stored', async () => {
    loadDek.mockResolvedValue(null);
    const { result } = await setup();
    let res: any;
    await act(async () => {
      res = await result.current.unlockWithBiometrics();
    });
    expect(res.error).toEqual(expect.any(String));
    expect(result.current.dek).toBeNull();
  });

  it('errors (no throw) when the prompt is cancelled', async () => {
    loadDek.mockRejectedValue(new Error('cancelled'));
    const { result } = await setup();
    let res: any;
    await act(async () => {
      res = await result.current.unlockWithBiometrics();
    });
    expect(res.error).toEqual(expect.any(String));
  });
});

describe('enable / disable biometric unlock', () => {
  it('refuses to enable without an in-memory DEK', async () => {
    const { result } = await setup();
    let res: any;
    await act(async () => {
      res = await result.current.enableBiometricUnlock();
    });
    expect(res.error).toEqual(expect.any(String));
    expect(saveDek).not.toHaveBeenCalled();
  });

  it('saves the current DEK and flips the flag', async () => {
    const { result } = await setup();
    await act(async () => result.current.setDek(dek));
    let res: any;
    await act(async () => {
      res = await result.current.enableBiometricUnlock();
    });
    expect(res).toEqual({ error: null });
    expect(saveDek).toHaveBeenCalledWith(dek);
    expect(result.current.biometricUnlockAvailable).toBe(true);
  });

  it('keeps the flag off when saving fails', async () => {
    saveDek.mockRejectedValue(new Error('boom'));
    const { result } = await setup();
    await act(async () => result.current.setDek(dek));
    let res: any;
    await act(async () => {
      res = await result.current.enableBiometricUnlock();
    });
    expect(res.error).toEqual(expect.any(String));
    expect(result.current.biometricUnlockAvailable).toBe(false);
  });

  it('disable clears storage and the flag', async () => {
    const { result } = await setup(true);
    await waitFor(() => expect(result.current.biometricUnlockAvailable).toBe(true));
    await act(async () => result.current.disableBiometricUnlock());
    expect(clearDek).toHaveBeenCalled();
    expect(result.current.biometricUnlockAvailable).toBe(false);
  });
});

it('resetEncryption wipes the in-memory and persisted DEK', async () => {
  const { result } = await setup(true);
  await act(async () => result.current.setDek(dek));
  await act(async () => result.current.resetEncryption());
  expect(result.current.dek).toBeNull();
  expect(clearDek).toHaveBeenCalled();
  expect(result.current.biometricUnlockAvailable).toBe(false);
});

describe('updatePassword', () => {
  it('requires a signed-in user with email', async () => {
    const { result } = await setup();
    let res: any;
    await act(async () => {
      res = await result.current.updatePassword(null, 'a', 'b');
    });
    expect(res.error).toEqual(expect.any(String));
    expect(rewrap).not.toHaveBeenCalled();
  });

  it('requires an in-memory DEK', async () => {
    const { result } = await setup();
    let res: any;
    await act(async () => {
      res = await result.current.updatePassword(user, 'a', 'b');
    });
    expect(res.error).toEqual(expect.any(String));
    expect(rewrap).not.toHaveBeenCalled();
  });

  it('delegates to rewrap with the current DEK and returns its result', async () => {
    rewrap.mockResolvedValue({ error: 'nope' });
    const { result } = await setup();
    await act(async () => result.current.setDek(dek));
    let res: any;
    await act(async () => {
      res = await result.current.updatePassword(user, 'old', 'new');
    });
    expect(res).toEqual({ error: 'nope' });
    expect(rewrap).toHaveBeenCalledWith({
      userId: 'u1',
      email: 'a@b.c',
      dek,
      currentPassword: 'old',
      newPassword: 'new',
    });
  });
});
