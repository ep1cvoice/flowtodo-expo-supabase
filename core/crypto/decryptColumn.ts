import { decryptField } from '@/core/crypto';

/** Identifies the database value being decrypted, so errors point at the exact row and column. */
export interface ColumnRef {
  table: string;
  id: number | string;
  column: string;
}

/** Thrown whenever an encrypted column cannot be turned into plaintext. */
export class DecryptionError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'DecryptionError';
    Object.setPrototypeOf(this, DecryptionError.prototype);
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

function describe(ref: ColumnRef): string {
  return `${ref.table}#${ref.id}.${ref.column}`;
}

/**
 * Decrypts a required encrypted column.
 * Throws DecryptionError when the key is missing, the ciphertext/IV is missing,
 * or decryption fails (wrong key, corrupted or tampered data). It never returns
 * an empty string to hide a failure.
 */
export function decryptColumn(
  dek: Uint8Array | null,
  encrypted: string | null,
  iv: string | null,
  ref: ColumnRef
): string {
  if (!dek) {
    throw new DecryptionError(
      `Cannot decrypt ${describe(ref)}: encryption key is not available (app locked?)`
    );
  }
  if (!encrypted || !iv) {
    throw new DecryptionError(
      `Cannot decrypt ${describe(ref)}: ${!encrypted ? 'ciphertext' : 'IV'} is missing`
    );
  }
  try {
    return decryptField(dek, encrypted, iv);
  } catch (err) {
    throw new DecryptionError(`Failed to decrypt ${describe(ref)}`, err);
  }
}

/**
 * Like decryptColumn, but for columns that are stored as NULL (both ciphertext
 * and IV) when the value is empty. Only that exact state yields ''; a column
 * with just one of the two set is corrupt and throws.
 */
export function decryptOptionalColumn(
  dek: Uint8Array | null,
  encrypted: string | null,
  iv: string | null,
  ref: ColumnRef
): string {
  if (encrypted == null && iv == null) return '';
  return decryptColumn(dek, encrypted, iv, ref);
}
