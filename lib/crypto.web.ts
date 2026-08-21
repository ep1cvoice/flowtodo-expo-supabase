import { Buffer } from 'buffer';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { gcm } from '@noble/ciphers/aes.js';

export interface EncryptedField {
  ciphertext: string; // Base64
  iv: string;         // Base64
}

const SALT_BYTES = 16;
const DEK_BYTES = 32; // AES-256
const IV_BYTES = 12;  // standard dla GCM
const PBKDF2_ITERATIONS = 250_000;
export const CURRENT_PBKDF2_ITERATIONS = PBKDF2_ITERATIONS;

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

// Webowe generowanie losowych bajtów przez natywne API przeglądarki
async function randomBytes(length: number): Promise<Uint8Array> {
  const arr = new Uint8Array(length);
  window.crypto.getRandomValues(arr);
  return arr;
}

function deriveKeyFromPassword(password: string, salt: Uint8Array, iterations: number): Uint8Array {
  const passBytes = new TextEncoder().encode(password);
  return pbkdf2(sha256, passBytes, salt, { c: iterations, dkLen: DEK_BYTES });
}

// @noble/ciphers automatycznie scala ciphertext z 16-bajtowym tagiem autoryzacyjnym,
// dokładnie tak, jak to robiłeś ręcznie w QuickCrypto.
function gcmEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array {
  const aesGcm = gcm(key, iv);
  return aesGcm.encrypt(plaintext);
}

// @noble/ciphers automatycznie weryfikuje tag doklejony na końcu
function gcmDecrypt(key: Uint8Array, iv: Uint8Array, combined: Uint8Array): Uint8Array {
  const aesGcm = gcm(key, iv);
  return aesGcm.decrypt(combined);
}

export interface EncryptionMaterial {
  salt: string;
  encryptedDek: string;
  dekIv: string;
  kdfIterations: number;
}

export async function generateEncryptionMaterial(password: string): Promise<EncryptionMaterial> {
  const saltBytes = await randomBytes(SALT_BYTES);
  const dekBytes = await randomBytes(DEK_BYTES);
  const ivBytes = await randomBytes(IV_BYTES);

  const kek = deriveKeyFromPassword(password, saltBytes, PBKDF2_ITERATIONS);
  const encryptedDekBytes = gcmEncrypt(kek, ivBytes, dekBytes);

  return {
    salt: toBase64(saltBytes),
    encryptedDek: toBase64(encryptedDekBytes),
    dekIv: toBase64(ivBytes),
    kdfIterations: PBKDF2_ITERATIONS,
  };
}

export async function encryptDekWithPassword(
  dek: Uint8Array,
  password: string
): Promise<EncryptionMaterial> {
  const saltBytes = await randomBytes(SALT_BYTES);
  const ivBytes = await randomBytes(IV_BYTES);

  const kek = deriveKeyFromPassword(password, saltBytes, PBKDF2_ITERATIONS);
  const encryptedDekBytes = gcmEncrypt(kek, ivBytes, dek);

  return {
    salt: toBase64(saltBytes),
    encryptedDek: toBase64(encryptedDekBytes),
    dekIv: toBase64(ivBytes),
    kdfIterations: PBKDF2_ITERATIONS,
  };
}

export function decryptDek(
  password: string,
  saltB64: string,
  encryptedDekB64: string,
  dekIvB64: string,
  kdfIterations: number
): Uint8Array {
  const salt = fromBase64(saltB64);
  const iv = fromBase64(dekIvB64);
  const encryptedDek = fromBase64(encryptedDekB64);

  const kek = deriveKeyFromPassword(password, salt, kdfIterations);
  return gcmDecrypt(kek, iv, encryptedDek);
}

export async function encryptField(dek: Uint8Array, plaintext: string): Promise<EncryptedField> {
  const ivBytes = await randomBytes(IV_BYTES);
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const ciphertextBytes = gcmEncrypt(dek, ivBytes, plaintextBytes);

  return {
    ciphertext: toBase64(ciphertextBytes),
    iv: toBase64(ivBytes),
  };
}

export function decryptField(dek: Uint8Array, ciphertextB64: string, ivB64: string): string {
  const ciphertext = fromBase64(ciphertextB64);
  const iv = fromBase64(ivB64);
  const plaintextBytes = gcmDecrypt(dek, iv, ciphertext);
  return new TextDecoder().decode(plaintextBytes);
}

export function hashForUniqueness(dek: Uint8Array, plaintext: string): string {
  const normalized = plaintext.trim().toLowerCase();
  const plaintextBytes = new TextEncoder().encode(normalized);
  const hashBytes = hmac(sha256, dek, plaintextBytes);
  return toBase64(new Uint8Array(hashBytes));
}
