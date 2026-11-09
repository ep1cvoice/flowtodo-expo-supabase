import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { resolveDekFromPassword } from '@/core/auth/dek';
import { rewrapDekAndUpdatePassword } from '@/core/auth/updatePassword';
import { toastForError } from '@/shared/lib/networkError';
import {
  saveDekToSecureStoreTracked,
  loadDekFromSecureStore,
  clearDekFromSecureStoreTracked,
  hasStoredDek,
} from '@/core/auth/secureStorage';
import type { User } from '@/types';

type Result = { error: string | null };
type SessionUser = Pick<User, 'id' | 'email'>;

interface EncryptionState {
  dek: Uint8Array | null;
  /** Whether a DEK is saved in the platform secure store for this device. */
  biometricUnlockAvailable: boolean;
}

/** Referentially stable for the provider's lifetime — never causes re-renders. */
interface EncryptionActions {
  /** Put a freshly derived DEK in memory (sign-in). */
  setDek: (dek: Uint8Array) => void;
  /** Drop the in-memory DEK only (session ended). */
  clearDek: () => void;
  /** Wipe the in-memory DEK and the persisted one (logout / account deletion). */
  resetEncryption: () => Promise<void>;
  unlock: (password: string, user: SessionUser | null) => Promise<Result>;
  /** Try to unlock using the device's biometrics/PIN instead of the password. */
  unlockWithBiometrics: () => Promise<Result>;
  /** Explicit opt-in: persist the current in-memory DEK to secure storage. */
  enableBiometricUnlock: () => Promise<Result>;
  /** Explicit opt-out: wipe the persisted DEK from secure storage. */
  disableBiometricUnlock: () => Promise<void>;
  updatePassword: (
    user: SessionUser | null,
    currentPassword: string,
    newPassword: string
  ) => Promise<Result>;
}

const EncryptionStateContext = createContext<EncryptionState | null>(null);
const EncryptionActionsContext = createContext<EncryptionActions | null>(null);

export function EncryptionProvider({ children }: { children: React.ReactNode }) {
  const [dek, setDekState] = useState<Uint8Array | null>(null);
  const [biometricUnlockAvailable, setBiometricUnlockAvailable] = useState(false);
  const dekRef = useRef<Uint8Array | null>(null);

  const applyDek = useCallback((next: Uint8Array | null) => {
    dekRef.current = next;
    setDekState(next);
  }, []);

  useEffect(() => {
    let isMounted = true;
    hasStoredDek()
      .then((stored) => {
        if (isMounted) setBiometricUnlockAvailable(stored);
      })
      .catch((err) => {
        console.warn('hasStoredDek failed:', (err as Error)?.message ?? err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const actions = useMemo<EncryptionActions>(
    () => ({
      setDek: (next) => applyDek(next),
      clearDek: () => applyDek(null),

      resetEncryption: async () => {
        applyDek(null);
        // Ending the session invalidates the persisted DEK's usefulness too —
        // wipe it so a different account can't accidentally inherit it on
        // this device, and so re-login re-establishes it deliberately.
        await clearDekFromSecureStoreTracked();
        setBiometricUnlockAvailable(false);
      },

      unlock: async (password, user) => {
        if (!user?.id || !user?.email) {
          return { error: 'Brak aktywnej sesji.' };
        }
        try {
          const resolved = await resolveDekFromPassword({
            userId: user.id,
            password,
            verifyEmail: user.email,
            profileTimeoutLabel: 'unlockProfile',
            decryptFailLog: 'Failed to unlock DEK:',
            decryptFailError: 'Invalid password',
          });
          if (!resolved.ok) return { error: resolved.error };

          applyDek(resolved.dek);
          return { error: null };
        } catch (err) {
          console.warn('unlock failed:', (err as Error)?.message ?? err);
          return { error: toastForError(err, 'Nie udało się odblokować') };
        }
      },

      unlockWithBiometrics: async () => {
        try {
          const storedDek = await loadDekFromSecureStore();
          if (!storedDek) {
            return {
              error: 'Odblokowanie biometryczne nie jest skonfigurowane na tym urządzeniu.',
            };
          }
          applyDek(storedDek);
          return { error: null };
        } catch (err) {
          // User cancelled the prompt, auth failed, or hardware unavailable —
          // caller should fall back to showing the password unlock screen.
          console.warn('unlockWithBiometrics failed:', (err as Error)?.message ?? err);
          return { error: 'Uwierzytelnianie nie powiodło się. Użyj hasła.' };
        }
      },

      enableBiometricUnlock: async () => {
        const current = dekRef.current;
        if (!current) {
          return {
            error: 'Brak odszyfrowanego klucza. Odblokuj aplikację hasłem, aby to włączyć.',
          };
        }
        try {
          await saveDekToSecureStoreTracked(current);
          setBiometricUnlockAvailable(true);
          return { error: null };
        } catch (err) {
          console.warn('enableBiometricUnlock failed:', (err as Error)?.message ?? err);
          return { error: 'Nie udało się zapisać klucza w bezpiecznym magazynie urządzenia.' };
        }
      },

      disableBiometricUnlock: async () => {
        await clearDekFromSecureStoreTracked();
        setBiometricUnlockAvailable(false);
      },

      updatePassword: async (user, currentPassword, newPassword) => {
        if (!user?.email) {
          return { error: 'Please sign in to update your password.' };
        }
        const current = dekRef.current;
        if (!current) {
          return {
            error: 'Brak odszyfrowanego klucza. Zaloguj się ponownie przed zmianą hasła.',
          };
        }
        // The raw DEK bytes are unchanged by a password change (only the
        // password-derived wrapping key is re-derived and the DEK is
        // re-wrapped) — no need to touch the secure store here.
        return rewrapDekAndUpdatePassword({
          userId: user.id,
          email: user.email,
          dek: current,
          currentPassword,
          newPassword,
        });
      },
    }),
    [applyDek]
  );

  const state = useMemo(() => ({ dek, biometricUnlockAvailable }), [dek, biometricUnlockAvailable]);

  return (
    <EncryptionActionsContext.Provider value={actions}>
      <EncryptionStateContext.Provider value={state}>{children}</EncryptionStateContext.Provider>
    </EncryptionActionsContext.Provider>
  );
}

/** Stable actions only; components using this do not re-render on DEK changes. */
export function useEncryptionActions(): EncryptionActions {
  const ctx = useContext(EncryptionActionsContext);
  if (!ctx) throw new Error('useEncryptionActions must be used within EncryptionProvider');
  return ctx;
}

/** DEK + biometric state plus actions. Re-renders when the DEK changes. */
export function useEncryption(): EncryptionState & EncryptionActions {
  const state = useContext(EncryptionStateContext);
  const actions = useContext(EncryptionActionsContext);
  if (!state || !actions) throw new Error('useEncryption must be used within EncryptionProvider');
  return { ...state, ...actions };
}
