import { strings } from '@/shared/lib/strings';
import {
  PROFILE_RETRY_ATTEMPTS,
  PROFILE_RETRY_DELAY_MS,
} from '@/core/auth/constants';
import { encryptDekWithPassword } from '@/core/crypto';
import { withRetry } from '@/shared/lib/retry';
import { supabase } from '@/core/supabase/client';
import { logger } from '@/shared/lib/logger';

type DekRow = {
  salt: string;
  encrypted_dek: string;
  dek_iv: string;
  kdf_iterations: number;
};

const EMPTY_BACKUP = { salt_backup: null, encrypted_dek_backup: null, dek_iv_backup: null };

function retryProfileWrite(fn: () => Promise<void>) {
  return withRetry(fn, { attempts: PROFILE_RETRY_ATTEMPTS, delayMs: PROFILE_RETRY_DELAY_MS });
}

async function verifyCurrentPassword(email: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

/** Reads the current wrapped DEK so it can be backed up and restored. Null if missing/incomplete. */
async function readCurrentDekRow(userId: string): Promise<DekRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('salt, encrypted_dek, dek_iv, kdf_iterations')
    .eq('id', userId)
    .single();

  if (error || !data?.salt || !data.encrypted_dek || !data.dek_iv) return null;
  return data as DekRow;
}

/** Writes the DEK re-wrapped with the new password, keeping the old wrap as a backup. */
async function writeRewrappedDek(
  userId: string,
  wrapped: Awaited<ReturnType<typeof encryptDekWithPassword>>,
  previous: DekRow
): Promise<void> {
  await retryProfileWrite(async () => {
    const { error, data: updated } = await supabase
      .from('profiles')
      .update({
        salt: wrapped.salt,
        encrypted_dek: wrapped.encryptedDek,
        dek_iv: wrapped.dekIv,
        kdf_iterations: wrapped.kdfIterations,
        salt_backup: previous.salt,
        encrypted_dek_backup: previous.encrypted_dek,
        dek_iv_backup: previous.dek_iv,
      })
      .eq('id', userId)
      .select('id');

    if (error) throw error;
    if (!updated || updated.length === 0) throw new Error(strings.auth.errors.profileNotReady);
  });
}

/** Restores the previous wrap and clears the backup. Throws if every attempt fails. */
async function rollbackDek(userId: string, previous: DekRow): Promise<void> {
  await retryProfileWrite(async () => {
    const { error } = await supabase
      .from('profiles')
      .update({
        salt: previous.salt,
        encrypted_dek: previous.encrypted_dek,
        dek_iv: previous.dek_iv,
        kdf_iterations: previous.kdf_iterations,
        ...EMPTY_BACKUP,
      })
      .eq('id', userId);

    if (error) throw error;
  });
}

async function clearDekBackup(userId: string): Promise<void> {
  await supabase.from('profiles').update(EMPTY_BACKUP).eq('id', userId);
}

export async function rewrapDekAndUpdatePassword(options: {
  userId: string;
  email: string;
  dek: Uint8Array;
  currentPassword: string;
  newPassword: string;
}): Promise<{ error: string | null }> {
  if (!(await verifyCurrentPassword(options.email, options.currentPassword))) {
    return { error: strings.auth.errors.currentPasswordIncorrect };
  }

  const previous = await readCurrentDekRow(options.userId);
  if (!previous) {
    return { error: strings.auth.errors.readEncryptionData };
  }

  const wrapped = await encryptDekWithPassword(options.dek, options.newPassword);

  try {
    await writeRewrappedDek(options.userId, wrapped, previous);
  } catch (err) {
    logger.warn(strings.auth.errors.rewrapDekLog, err);
    return { error: strings.auth.errors.updateEncryptionFailed };
  }

  const { error: authError } = await supabase.auth.updateUser({ password: options.newPassword });

  if (authError) {
    logger.error(strings.auth.errors.authPasswordUpdateLog, authError);
    try {
      await rollbackDek(options.userId, previous);
    } catch (rollbackErr) {
      logger.error(strings.auth.errors.rollbackFailedLog, rollbackErr);
      return { error: strings.auth.errors.passwordRollbackFailed };
    }
    return { error: strings.auth.errors.changePasswordFailed };
  }

  await clearDekBackup(options.userId);
  return { error: null };
}
