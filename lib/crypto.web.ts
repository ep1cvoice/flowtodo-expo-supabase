import { Buffer } from 'buffer';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { gcm } from '@noble/ciphers/aes.js';

export interface EncryptedField {
  ciphertext: string; // Base64
  iv: string; // Base64
}

const SALT_BYTES = 16;
const DEK_BYTES = 32; // AES-256
const IV_BYTES = 12; // standard dla GCM
const PBKDF2_ITERATIONS = 250_000;
export const CURRENT_PBKDF2_ITERATIONS = PBKDF2_ITERATIONS;

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function randomBytes(length: number): Promise<Uint8Array> {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
}

/**
 * PBKDF2-SHA256 via Web Crypto (native browser) — same params as QuickCrypto / former @noble path.
 * This is the unlock bottleneck; SubtleCrypto is orders of magnitude faster than pure-JS.
 */
async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    DEK_BYTES * 8
  );
  return new Uint8Array(bits);
}

/** Ciphertext || 16-byte GCM tag — same layout as QuickCrypto / @noble gcm. */
function gcmEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array {
  return gcm(key, iv).encrypt(plaintext);
}

function gcmDecrypt(key: Uint8Array, iv: Uint8Array, combined: Uint8Array): Uint8Array {
  return gcm(key, iv).decrypt(combined);
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

  const kek = await deriveKeyFromPassword(password, saltBytes, PBKDF2_ITERATIONS);
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

  const kek = await deriveKeyFromPassword(password, saltBytes, PBKDF2_ITERATIONS);
  const encryptedDekBytes = gcmEncrypt(kek, ivBytes, dek);

  return {
    salt: toBase64(saltBytes),
    encryptedDek: toBase64(encryptedDekBytes),
    dekIv: toBase64(ivBytes),
    kdfIterations: PBKDF2_ITERATIONS,
  };
}

export async function decryptDek(
  password: string,
  saltB64: string,
  encryptedDekB64: string,
  dekIvB64: string,
  kdfIterations: number
): Promise<Uint8Array> {
  const salt = fromBase64(saltB64);
  const iv = fromBase64(dekIvB64);
  const encryptedDek = fromBase64(encryptedDekB64);

  const kek = await deriveKeyFromPassword(password, salt, kdfIterations);
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
