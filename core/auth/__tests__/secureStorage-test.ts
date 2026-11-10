// Characterization tests for secureStorage (DEK persistence in the platform secure store).
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Buffer } from 'buffer';
import {
  clearDekFromSecureStore,
  clearDekFromSecureStoreTracked,
  hasStoredDek,
  isDeviceUnlockAvailable,
  loadDekFromSecureStore,
  saveDekToSecureStore,
  saveDekToSecureStoreTracked,
} from '@/core/auth/secureStorage';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked-this-device-only',
  isAvailableAsync: jest.fn(),
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
}));

const store = SecureStore as jest.Mocked<typeof SecureStore>;
const localAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;

const dek = new Uint8Array([1, 2, 3, 4]);
const dekBase64 = Buffer.from(dek).toString('base64');

beforeEach(() => {
  jest.resetAllMocks();
  store.isAvailableAsync.mockResolvedValue(true);
});

describe('isDeviceUnlockAvailable', () => {
  it('is false when secure store is unavailable', async () => {
    store.isAvailableAsync.mockResolvedValue(false);
    expect(await isDeviceUnlockAvailable()).toBe(false);
    expect(localAuth.hasHardwareAsync).not.toHaveBeenCalled();
  });

  it('depends on hardware presence only (enrollment is not required)', async () => {
    localAuth.hasHardwareAsync.mockResolvedValue(true);
    localAuth.isEnrolledAsync.mockResolvedValue(false);
    expect(await isDeviceUnlockAvailable()).toBe(true);
    localAuth.hasHardwareAsync.mockResolvedValue(false);
    expect(await isDeviceUnlockAvailable()).toBe(false);
  });
});

describe('saveDekToSecureStore', () => {
  it('stores the base64 DEK behind authentication', async () => {
    await saveDekToSecureStore(dek);
    expect(store.setItemAsync).toHaveBeenCalledWith(
      'flowtodo_dek_v1',
      dekBase64,
      expect.objectContaining({
        requireAuthentication: true,
        keychainAccessible: 'when-unlocked-this-device-only',
      })
    );
  });

  it('throws when secure store is unavailable', async () => {
    store.isAvailableAsync.mockResolvedValue(false);
    await expect(saveDekToSecureStore(dek)).rejects.toThrow();
    expect(store.setItemAsync).not.toHaveBeenCalled();
  });
});

describe('loadDekFromSecureStore', () => {
  it('returns the decoded DEK', async () => {
    store.getItemAsync.mockResolvedValue(dekBase64);
    expect(await loadDekFromSecureStore()).toEqual(dek);
  });

  it('returns null when nothing is stored or store is unavailable', async () => {
    store.getItemAsync.mockResolvedValue(null);
    expect(await loadDekFromSecureStore()).toBeNull();
    store.isAvailableAsync.mockResolvedValue(false);
    expect(await loadDekFromSecureStore()).toBeNull();
  });

  it('propagates authentication failures', async () => {
    store.getItemAsync.mockRejectedValue(new Error('cancelled'));
    await expect(loadDekFromSecureStore()).rejects.toThrow('cancelled');
  });
});

describe('clearDekFromSecureStore', () => {
  it('deletes the DEK, and is a no-op when the store is unavailable', async () => {
    await clearDekFromSecureStore();
    expect(store.deleteItemAsync).toHaveBeenCalledWith('flowtodo_dek_v1');
    store.deleteItemAsync.mockClear();
    store.isAvailableAsync.mockResolvedValue(false);
    await clearDekFromSecureStore();
    expect(store.deleteItemAsync).not.toHaveBeenCalled();
  });
});

describe('hasStoredDek and tracked variants', () => {
  it('reads the unprotected sentinel flag', async () => {
    store.getItemAsync.mockResolvedValue('1');
    expect(await hasStoredDek()).toBe(true);
    expect(store.getItemAsync).toHaveBeenCalledWith('flowtodo_dek_v1_flag');
    store.getItemAsync.mockResolvedValue(null);
    expect(await hasStoredDek()).toBe(false);
  });

  it('saveTracked sets the flag after saving', async () => {
    await saveDekToSecureStoreTracked(dek);
    expect(store.setItemAsync).toHaveBeenCalledWith('flowtodo_dek_v1_flag', '1');
  });

  it('saveTracked does not set the flag when saving fails', async () => {
    store.setItemAsync.mockRejectedValueOnce(new Error('boom'));
    await expect(saveDekToSecureStoreTracked(dek)).rejects.toThrow('boom');
    expect(store.setItemAsync).toHaveBeenCalledTimes(1);
  });

  it('clearTracked deletes the DEK and the flag', async () => {
    await clearDekFromSecureStoreTracked();
    expect(store.deleteItemAsync).toHaveBeenCalledWith('flowtodo_dek_v1');
    expect(store.deleteItemAsync).toHaveBeenCalledWith('flowtodo_dek_v1_flag');
  });
});
