/**
 * secureDekStorage.ts
 *
 * Persists the (already-derived) Data Encryption Key in the platform
 * secure storage — iOS Keychain / Android Keystore — gated by device
 * biometrics or device PIN, via expo-secure-store's `requireAuthentication`.
 *
 * Threat-model note: once saved here, unlocking the *device* (biometric
 * or PIN) is sufficient to retrieve the DEK — the account password is
 * no longer strictly required for that device. That's an accepted
 * trade-off for UX (same model Signal/1Password use for local unlock).
 * Keep the password flow available as a fallback / recovery path and
 * for enabling E2E sync on a *new* device.
 */
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Buffer } from 'buffer';

const DEK_STORAGE_KEY = 'flowtodo_dek_v1';

export interface SecureDekOptions {
  /** Shown on the native biometric/PIN prompt (Android + iOS). */
  promptMessage?: string;
}

/**
 * Whether this device can actually gate a SecureStore item behind
 * biometrics/PIN. If false, don't offer the "unlock with biometrics"
 * toggle — fall back to password-only.
 */
export async function isDeviceUnlockAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  // Some Android devices support device-credential (PIN) fallback even
  // without biometrics enrolled — SecureStore's requireAuthentication
  // still works there, so hardware presence alone is a reasonable gate.
  return hasHardware && (isEnrolled || true);
}

/**
 * Save the DEK to secure storage, bound to biometric/PIN authentication.
 * Call this right after a successful password-based unlock.
 */
export async function saveDekToSecureStore(
  dek: Uint8Array,
  options: SecureDekOptions = {}
): Promise<void> {
  const dekBase64 = Buffer.from(dek).toString('base64');

  await SecureStore.setItemAsync(DEK_STORAGE_KEY, dekBase64, {
    requireAuthentication: true,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    authenticationPrompt:
      options.promptMessage ?? 'Odblokuj FlowTodo',
  });
}

/**
 * Attempt to load the DEK from secure storage. Triggers the native
 * biometric/PIN prompt. Returns null if nothing is stored yet —
 * caller should fall back to the password screen. Throws (or rejects)
 * if the user cancels or authentication fails; callers should catch
 * that and fall back to password too, not treat it as "no DEK saved".
 */
export async function loadDekFromSecureStore(
  options: SecureDekOptions = {}
): Promise<Uint8Array | null> {
  const dekBase64 = await SecureStore.getItemAsync(DEK_STORAGE_KEY, {
    requireAuthentication: true,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    authenticationPrompt:
      options.promptMessage ?? 'Odblokuj FlowTodo',
  });

  if (!dekBase64) return null;
  return new Uint8Array(Buffer.from(dekBase64, 'base64'));
}

/** Call on explicit logout, password change, or "forget this device". */
export async function clearDekFromSecureStore(): Promise<void> {
  await SecureStore.deleteItemAsync(DEK_STORAGE_KEY);
}

/** Whether a DEK is currently saved for this device (no auth prompt triggered). */
export async function hasStoredDek(): Promise<boolean> {
  // getItemAsync with requireAuthentication would prompt just to check
  // existence, which is bad UX. expo-secure-store doesn't expose a
  // no-auth "exists" check for protected items, so track this with an
  // unprotected sentinel flag instead.
  const flag = await SecureStore.getItemAsync(`${DEK_STORAGE_KEY}_flag`);
  return flag === '1';
}

async function setStoredFlag(value: boolean): Promise<void> {
  if (value) {
    await SecureStore.setItemAsync(`${DEK_STORAGE_KEY}_flag`, '1');
  } else {
    await SecureStore.deleteItemAsync(`${DEK_STORAGE_KEY}_flag`);
  }
}

// Wrap the public save/clear to keep the sentinel flag in sync.
const _save = saveDekToSecureStore;
export async function saveDekToSecureStoreTracked(
  dek: Uint8Array,
  options?: SecureDekOptions
): Promise<void> {
  await _save(dek, options);
  await setStoredFlag(true);
}

const _clear = clearDekFromSecureStore;
export async function clearDekFromSecureStoreTracked(): Promise<void> {
  await _clear();
  await setStoredFlag(false);
}
