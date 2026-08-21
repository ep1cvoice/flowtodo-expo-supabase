import { EncryptedField, EncryptionMaterial } from './crypto.native';
export { EncryptedField, EncryptionMaterial };

export const CURRENT_PBKDF2_ITERATIONS: number;

export function generateEncryptionMaterial(password: string): Promise<EncryptionMaterial>;

export function encryptDekWithPassword(
  dek: Uint8Array,
  password: string
): Promise<EncryptionMaterial>;

export function decryptDek(
  password: string,
  saltB64: string,
  encryptedDekB64: string,
  dekIvB64: string,
  kdfIterations: number
): Uint8Array;

export function encryptField(dek: Uint8Array, plaintext: string): Promise<EncryptedField>;

export function decryptField(dek: Uint8Array, ciphertextB64: string, ivB64: string): string;

export function hashForUniqueness(dek: Uint8Array, plaintext: string): string;
