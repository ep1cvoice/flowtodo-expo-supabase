import { strings } from '@/shared/lib/strings';
import {
  LEGACY_KDF_ITERATIONS,
  PROFILE_RETRY_ATTEMPTS,
  PROFILE_RETRY_DELAY_MS,
} from '@/core/auth/constants';
import {
  CURRENT_PBKDF2_ITERATIONS,
  decryptDek,
  encryptDekWithPassword,
  generateEncryptionMaterial,
} from '@/core/crypto';
import { withRetry } from '@/shared/lib/retry';
import { loadCachedProfileRow } from '@/core/auth/offlineCache';
import { fetchProfileRow, fetchProfileRowWithSource } from '@/core/auth/profile';
import { isRejectedPassword } from '@/core/auth/rejectedPassword';
import { toastForError } from '@/shared/lib/networkError';
import { supabase } from '@/core/supabase/client';
import { logger } from '@/shared/lib/logger';

type DekMaterial = {
  salt: string;
  encrypted_dek: string;
  dek_iv: string;
  kdf_iterations: number;
};

/**
 * Re-wraps the DEK with the current (stronger) PBKDF2 iteration count, in the background,
 * without blocking the UI. Called after a successful unwrap when the material is older.
 *
 * The write only applies while the server still holds the material that was unwrapped
 * (`unwrapped`): if the password was changed on another device meanwhile, a re-wrap with
 * the old password must not replace the new wrap.
 */
async function upgradeKdfIterationsInBackground(
  userId: string,
  decryptedDek: Uint8Array,
  password: string,
  currentIterations: number,
  unwrapped: Pick<DekMaterial, 'salt' | 'encrypted_dek'>
) {
  if (currentIterations >= CURRENT_PBKDF2_ITERATIONS) return;

  try {
    const rewrapped = await encryptDekWithPassword(decryptedDek, password);
    const { error } = await supabase
      .from('profiles')
      .update({
        salt: rewrapped.salt,
        encrypted_dek: rewrapped.encryptedDek,
        dek_iv: rewrapped.dekIv,
        kdf_iterations: rewrapped.kdfIterations,
      })
      .eq('id', userId)
      .eq('salt', unwrapped.salt)
      .eq('encrypted_dek', unwrapped.encrypted_dek);

    if (error) {
      logger.warn('KDF iterations upgrade failed:', error.message);
    } else {
      void fetchProfileRow(userId).catch(() => {}); // refresh the cached material
    }
  } catch (err) {
    logger.warn('KDF iterations upgrade threw:', err);
  }
}

/**
 * Creates the DEK of an account that has none yet. The write only fills an empty profile
 * (`encrypted_dek IS NULL`), so it can never replace a key another device stored meanwhile;
 * in that case the stored key is returned instead and unwrapped with the same password.
 */
async function backfillDekMaterial(
  userId: string,
  password: string
): Promise<{ ok: true; material: DekMaterial } | { ok: false; error: string }> {
  const generated = await generateEncryptionMaterial(password);
  const generatedMaterial: DekMaterial = {
    salt: generated.salt,
    encrypted_dek: generated.encryptedDek,
    dek_iv: generated.dekIv,
    kdf_iterations: generated.kdfIterations,
  };

  try {
    const material = await withRetry(
      async () => {
        const { error: updateError, data: updated } = await supabase
          .from('profiles')
          .update(generatedMaterial)
          .eq('id', userId)
          .is('encrypted_dek', null)
          .select('id');

        if (updateError) throw updateError;
        if (updated && updated.length > 0) return generatedMaterial;

        // Nothing updated: either the profile row does not exist yet (the signup trigger)
        // or it already holds a key.
        const { data: stored, error: readError } = await supabase
          .from('profiles')
          .select('salt, encrypted_dek, dek_iv, kdf_iterations')
          .eq('id', userId)
          .maybeSingle();
        if (readError) throw readError;
        if (stored?.encrypted_dek && stored.salt && stored.dek_iv) return stored as DekMaterial;
        throw new Error(strings.auth.errors.profileNotReady);
      },
      { attempts: PROFILE_RETRY_ATTEMPTS, delayMs: PROFILE_RETRY_DELAY_MS }
    );
    // Refresh the offline copy with the key that is now on the server.
    void fetchProfileRow(userId).catch(() => {});
    return { ok: true, material };
  } catch (err) {
    logger.warn('Failed to backfill encryption material:', err);
    return { ok: false, error: strings.auth.errors.configureEncryption };
  }
}

/** Unwraps the DEK; throws when the password is wrong or the material is corrupted. */
async function unwrapDek(
  password: string,
  material: Pick<DekMaterial, 'salt' | 'encrypted_dek' | 'dek_iv'> & {
    kdf_iterations: number | null;
  }
) {
  const iterations = Number(material.kdf_iterations) || LEGACY_KDF_ITERATIONS;
  const dek = await decryptDek(
    password,
    material.salt,
    material.encrypted_dek,
    material.dek_iv,
    iterations
  );
  return { dek, iterations };
}

/**
 * Fetches (or backfills) DEK material and unwraps the key.
 * The material cached by the last online visit is tried first, so unlocking never waits for
 * the network; the server copy is only consulted when that fails (e.g. the password was
 * changed on another device, or nothing is cached yet).
 * `verifyEmail` — only when the profile has no DEK yet: prove the password via Auth before generating one.
 */
export async function resolveDekFromPassword(options: {
  userId: string;
  password: string;
  verifyEmail?: string;
  decryptFailLog: string;
  decryptFailError: string;
}): Promise<{ ok: true; dek: Uint8Array } | { ok: false; error: string }> {
  const cached = await loadCachedProfileRow<{
    salt: string | null;
    encrypted_dek: string | null;
    dek_iv: string | null;
    kdf_iterations: number | null;
  }>(options.userId);
  if (cached?.salt && cached.encrypted_dek && cached.dek_iv) {
    try {
      const { dek, iterations } = await unwrapDek(options.password, {
        salt: cached.salt,
        encrypted_dek: cached.encrypted_dek,
        dek_iv: cached.dek_iv,
        kdf_iterations: cached.kdf_iterations,
      });
      void upgradeKdfIterationsInBackground(options.userId, dek, options.password, iterations, {
        salt: cached.salt,
        encrypted_dek: cached.encrypted_dek,
      });
      // Refresh the cached copy in the background (also picks up a password change made on
      // another device, after which the old password stops working here).
      void fetchProfileRow(options.userId).catch(() => {});
      return { ok: true, dek };
    } catch {
      // Stale or wrong: fall through to the server copy.
    }
  }

  let fetched;
  try {
    fetched = await fetchProfileRowWithSource(options.userId);
  } catch {
    return { ok: false, error: strings.auth.errors.fetchEncryptionProfile };
  }

  let { salt, encrypted_dek, dek_iv, kdf_iterations } = fetched.row;

  if (!salt || !encrypted_dek || !dek_iv) {
    // The offline copy may predate the key: only the server can tell the account has none.
    if (fetched.fromCache) {
      return { ok: false, error: strings.auth.errors.fetchEncryptionProfile };
    }
    if (options.verifyEmail) {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: options.verifyEmail,
        password: options.password,
      });
      // Never create a key from an unverified password (also not when Auth was unreachable).
      if (reauthError) {
        return {
          ok: false,
          error: isRejectedPassword(reauthError)
            ? strings.auth.errors.invalidPassword
            : toastForError(reauthError, strings.auth.errors.configureEncryption),
        };
      }
    }

    const backfilled = await backfillDekMaterial(options.userId, options.password);
    if (!backfilled.ok) return { ok: false, error: backfilled.error };

    salt = backfilled.material.salt;
    encrypted_dek = backfilled.material.encrypted_dek;
    dek_iv = backfilled.material.dek_iv;
    kdf_iterations = backfilled.material.kdf_iterations;
  }

  try {
    const { dek: decryptedDek, iterations } = await unwrapDek(options.password, {
      salt,
      encrypted_dek,
      dek_iv,
      kdf_iterations,
    });

    void upgradeKdfIterationsInBackground(
      options.userId,
      decryptedDek,
      options.password,
      iterations,
      { salt, encrypted_dek }
    );

    return { ok: true, dek: decryptedDek };
  } catch (err) {
    logger.warn(options.decryptFailLog, err);
    return { ok: false, error: options.decryptFailError };
  }
}
