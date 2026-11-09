import { strings } from '@/shared/lib/strings';
import {
  PROFILE_RETRY_ATTEMPTS,
  PROFILE_RETRY_DELAY_MS,
} from '@/core/auth/constants';
import { encryptDekWithPassword } from '@/core/crypto';
import { withRetry } from '@/shared/lib/retry';
import { supabase } from '@/core/supabase/client';
import { logger } from '@/shared/lib/logger';

export async function rewrapDekAndUpdatePassword(options: {
  userId: string;
  email: string;
  dek: Uint8Array;
  currentPassword: string;
  newPassword: string;
}): Promise<{ error: string | null }> {
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: options.email,
    password: options.currentPassword,
  });
  if (reauthError) {
    return { error: strings.auth.errors.currentPasswordIncorrect };
  }

  const { data: currentProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('salt, encrypted_dek, dek_iv, kdf_iterations')
    .eq('id', options.userId)
    .single();

  if (
    fetchError ||
    !currentProfile?.salt ||
    !currentProfile?.encrypted_dek ||
    !currentProfile?.dek_iv
  ) {
    return { error: strings.auth.errors.readEncryptionData };
  }

  const { salt, encryptedDek, dekIv, kdfIterations } = await encryptDekWithPassword(
    options.dek,
    options.newPassword
  );

  try {
    await withRetry(
      async () => {
        const { error: updateError, data: updated } = await supabase
          .from('profiles')
          .update({
            salt,
            encrypted_dek: encryptedDek,
            dek_iv: dekIv,
            kdf_iterations: kdfIterations,
            salt_backup: currentProfile.salt,
            encrypted_dek_backup: currentProfile.encrypted_dek,
            dek_iv_backup: currentProfile.dek_iv,
          })
          .eq('id', options.userId)
          .select('id');

        if (updateError) throw updateError;
        if (!updated || updated.length === 0) throw new Error(strings.auth.errors.profileNotReady);
      },
      { attempts: PROFILE_RETRY_ATTEMPTS, delayMs: PROFILE_RETRY_DELAY_MS }
    );
  } catch (err) {
    logger.warn('Failed to re-encrypt DEK:', err);
    return {
      error:
        'Unable to update encryption. Password was not changed — try again.',
    };
  }

  const { error } = await supabase.auth.updateUser({ password: options.newPassword });

  if (error) {
    logger.error('Auth password update failed, rolling back encrypted_dek:', error);

    try {
      await withRetry(
        async () => {
          const { error: rollbackError } = await supabase
            .from('profiles')
            .update({
              salt: currentProfile.salt,
              encrypted_dek: currentProfile.encrypted_dek,
              dek_iv: currentProfile.dek_iv,
              kdf_iterations: currentProfile.kdf_iterations,
              salt_backup: null,
              encrypted_dek_backup: null,
              dek_iv_backup: null,
            })
            .eq('id', options.userId);

          if (rollbackError) throw rollbackError;
        },
        { attempts: PROFILE_RETRY_ATTEMPTS, delayMs: PROFILE_RETRY_DELAY_MS }
      );
    } catch (rollbackErr) {
      logger.error('CRITICAL: rollback of encrypted_dek also failed:', rollbackErr);
      return {
        error:
          'Critical password change error. Contact support — your data is safe, but requires manual recovery.',
      };
    }

    return { error: strings.auth.errors.changePasswordFailed };
  }

  await supabase
    .from('profiles')
    .update({ salt_backup: null, encrypted_dek_backup: null, dek_iv_backup: null })
    .eq('id', options.userId);

  return { error: null };
}
