import {
  LEGACY_KDF_ITERATIONS,
  PROFILE_FETCH_TIMEOUT_MS,
  PROFILE_RETRY_ATTEMPTS,
  PROFILE_RETRY_DELAY_MS,
} from '@/lib/auth/constants';
import {
  CURRENT_PBKDF2_ITERATIONS,
  decryptDek,
  encryptDekWithPassword,
  generateEncryptionMaterial,
} from '@/lib/crypto';
import { migrateUserEncryption } from '@/lib/crypto/migrateEncryption';
import { withRetry } from '@/lib/retry';
import { withTimeout } from '@/lib/withTimeout';
import { supabase } from '@/supabase/client';

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
      console.warn('KDF iterations upgrade failed:', error.message);
    }
  } catch (err) {
    console.warn('KDF iterations upgrade threw:', err);
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
        if (!updated || updated.length === 0) throw new Error('Profile row not ready yet');
      },
      { attempts: PROFILE_RETRY_ATTEMPTS, delayMs: PROFILE_RETRY_DELAY_MS }
    );
  } catch (err) {
    console.warn('Failed to backfill encryption material:', err);
    return { ok: false, error: 'Unable to configure encryption. Try again.' };
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

/**
 * Fetches (or backfills) DEK material and unwraps the key.
 * `verifyEmail` — only when the profile has no DEK yet: prove the password via Auth before generating one.
 */
export async function resolveDekFromPassword(options: {
  userId: string;
  password: string;
  verifyEmail?: string;
  profileTimeoutLabel: string;
  decryptFailLog: string;
  decryptFailError: string;
}): Promise<{ ok: true; dek: Uint8Array } | { ok: false; error: string }> {
  const { data: profileData, error: profileError } = await withTimeout(
    supabase
      .from('profiles')
      .select('salt, encrypted_dek, dek_iv, kdf_iterations')
      .eq('id', options.userId)
      .single(),
    PROFILE_FETCH_TIMEOUT_MS,
    options.profileTimeoutLabel
  );

  if (profileError || !profileData) {
    return { ok: false, error: 'Unable to fetch encryption profile data' };
  }

  let { salt, encrypted_dek, dek_iv, kdf_iterations } = profileData;

  if (!salt || !encrypted_dek || !dek_iv) {
    if (options.verifyEmail) {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: options.verifyEmail,
        password: options.password,
      });
      if (reauthError && isRejectedPassword(reauthError)) {
        return { ok: false, error: 'Invalid password' };
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
    const iterations = Number(kdf_iterations) || LEGACY_KDF_ITERATIONS;
    const decryptedDek = await decryptDek(
      options.password,
      salt,
      encrypted_dek,
      dek_iv,
      iterations
    );

    void upgradeKdfIterationsInBackground(
      options.userId,
      decryptedDek,
      options.password,
      iterations
    );
    void migrateUserEncryption(options.userId, decryptedDek).catch((err) =>
      console.warn('Background encryption migration failed:', err)
    );

    return { ok: true, dek: decryptedDek };
  } catch (err) {
    console.warn(options.decryptFailLog, err);
    return { ok: false, error: options.decryptFailError };
  }
}
