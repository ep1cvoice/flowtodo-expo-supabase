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
import { fetchProfileRow } from '@/core/auth/profile';
import { supabase } from '@/core/supabase/client';
import { logger } from '@/shared/lib/logger';

type DekMaterial = {
  salt: string;
  encrypted_dek: string;
  dek_iv: string;
  kdf_iterations: number;
};

function isRejectedPassword(
  err: { message?: string; status?: number; code?: string } | null
): boolean {
  if (!err) return false;
  if (err.code === 'invalid_credentials') return true;
  const message = (err.message ?? '').toLowerCase();
  return (
    message.includes('invalid login credentials') ||
    message.includes('invalid password') ||
    message.includes('email not confirmed')
  );
}

/**
 * Re-wrapuje DEK nową (silniejszą) liczbą iteracji PBKDF2, w tle, bez blokowania UI.
 * Wywoływane po udanym odszyfrowaniu, jeśli profil ma jeszcze starą wartość kdf_iterations.
 */
async function upgradeKdfIterationsInBackground(
  userId: string,
  decryptedDek: Uint8Array,
  password: string,
  currentIterations: number
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
      .eq('id', userId);

    if (error) {
      logger.warn('KDF iterations upgrade failed:', error.message);
    } else {
      void fetchProfileRow(userId).catch(() => {}); // refresh the cached material
    }
  } catch (err) {
    logger.warn('KDF iterations upgrade threw:', err);
  }
}

async function backfillDekMaterial(
  userId: string,
  password: string
): Promise<{ ok: true; material: DekMaterial } | { ok: false; error: string }> {
  const generated = await generateEncryptionMaterial(password);

  try {
    await withRetry(
      async () => {
        const { error: updateError, data: updated } = await supabase
          .from('profiles')
          .update({
            salt: generated.salt,
            encrypted_dek: generated.encryptedDek,
            dek_iv: generated.dekIv,
            kdf_iterations: generated.kdfIterations,
          })
          .eq('id', userId)
          .select('id');

        if (updateError) throw updateError;
        if (!updated || updated.length === 0) throw new Error(strings.auth.errors.profileNotReady);
      },
      { attempts: PROFILE_RETRY_ATTEMPTS, delayMs: PROFILE_RETRY_DELAY_MS }
    );
  } catch (err) {
    logger.warn('Failed to backfill encryption material:', err);
    return { ok: false, error: strings.auth.errors.configureEncryption };
  }

  return {
    ok: true,
    material: {
      salt: generated.salt,
      encrypted_dek: generated.encryptedDek,
      dek_iv: generated.dekIv,
      kdf_iterations: generated.kdfIterations,
    },
  };
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
      void upgradeKdfIterationsInBackground(options.userId, dek, options.password, iterations);
      // Refresh the cached copy in the background (also picks up a password change made on
      // another device, after which the old password stops working here).
      void fetchProfileRow(options.userId).catch(() => {});
      return { ok: true, dek };
    } catch {
      // Stale or wrong: fall through to the server copy.
    }
  }

  let profileData;
  try {
    profileData = await fetchProfileRow(options.userId);
  } catch {
    return { ok: false, error: strings.auth.errors.fetchEncryptionProfile };
  }

  let { salt, encrypted_dek, dek_iv, kdf_iterations } = profileData;

  if (!salt || !encrypted_dek || !dek_iv) {
    if (options.verifyEmail) {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: options.verifyEmail,
        password: options.password,
      });
      if (reauthError && isRejectedPassword(reauthError)) {
        return { ok: false, error: strings.auth.errors.invalidPassword };
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
      iterations
    );

    return { ok: true, dek: decryptedDek };
  } catch (err) {
    logger.warn(options.decryptFailLog, err);
    return { ok: false, error: options.decryptFailError };
  }
}
