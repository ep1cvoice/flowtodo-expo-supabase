/**
 * Native crypto: prefer react-native-quick-crypto (dev/preview builds).
 * Fall back to @noble when the native module is missing (Expo Go).
 * Wire format matches the web implementation (PBKDF2-SHA256 + AES-256-GCM with tag appended).
 */
import { Buffer } from 'buffer';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as ExpoCrypto from 'expo-crypto';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { gcm } from '@noble/ciphers/aes.js';
import { withTimeout } from '@/lib/withTimeout';

export interface EncryptedField {
  ciphertext: string; // Base64
  iv: string; // Base64
}

const SALT_BYTES = 16;
const DEK_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const PBKDF2_ITERATIONS = 250_000;
export const CURRENT_PBKDF2_ITERATIONS = PBKDF2_ITERATIONS;

type QuickCryptoModule = {
  randomBytes: (length: number) => Buffer;
  pbkdf2Sync: (
    password: string,
    salt: Buffer,
    iterations: number,
    keylen: number,
    digest: string
  ) => Buffer;
  createCipheriv: (
    algorithm: string,
    key: Buffer,
    iv: Buffer
  ) => {
    update: (data: Buffer) => Buffer;
    final: () => Buffer;
    getAuthTag: () => Buffer;
  };
  createDecipheriv: (
    algorithm: string,
    key: Buffer,
    iv: Buffer
  ) => {
    setAuthTag: (tag: Buffer) => void;
    update: (data: Buffer) => Buffer;
    final: () => Buffer;
  };
  createHmac: (
    algorithm: string,
    key: Buffer
  ) => {
    update: (data: Buffer) => void;
    digest: () => Buffer;
  };
};

function tryLoadQuickCrypto(): QuickCryptoModule | null {
  // Expo Go has no native QuickCrypto / QuickBase64 — never require it there.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-quick-crypto');
    return (mod?.default ?? mod) as QuickCryptoModule;
  } catch (err) {
    console.warn(
      '[crypto] react-native-quick-crypto unavailable. Using @noble fallback.',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

const QuickCrypto = tryLoadQuickCrypto();

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function randomBytes(length: number): Promise<Uint8Array> {
  if (QuickCrypto) {
    return new Uint8Array(QuickCrypto.randomBytes(length));
  }
  return ExpoCrypto.getRandomBytesAsync(length);
}

async function deriveKeyFromPassword(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  if (QuickCrypto) {
    const derived = QuickCrypto.pbkdf2Sync(
      password,
      Buffer.from(salt),
      iterations,
      DEK_BYTES,
      'sha256'
    );
    return new Uint8Array(derived);
  }

  const deriveViaWebView = (global as { deriveKeyViaWebView?: (
    password: string,
    saltBase64: string,
    iterations: number
  ) => Promise<string> }).deriveKeyViaWebView;

  if (deriveViaWebView) {
    try {
      const saltBase64 = toBase64(salt);
      const keyBase64 = await withTimeout(
        deriveViaWebView(password, saltBase64, iterations),
        16_000,
        'pbkdf2WebView'
      );
      return fromBase64(keyBase64);
    } catch (err) {
      console.warn(
        '[crypto] WebView PBKDF2 failed, using @noble.',
        err instanceof Error ? err.message : err
      );
    }
  }

  console.warn('[crypto] Using @noble PBKDF2 fallback.');
  const passBytes = new TextEncoder().encode(password);
  return pbkdf2(sha256, passBytes, salt, { c: iterations, dkLen: DEK_BYTES });
}

function gcmEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array {
  if (QuickCrypto) {
    const cipher = QuickCrypto.createCipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv));
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
    const tag = cipher.getAuthTag();
    return new Uint8Array(Buffer.concat([ciphertext, tag]));
  }
  return gcm(key, iv).encrypt(plaintext);
}

function gcmDecrypt(key: Uint8Array, iv: Uint8Array, combined: Uint8Array): Uint8Array {
  if (QuickCrypto) {
    const combinedBuf = Buffer.from(combined);
    const ciphertext = combinedBuf.subarray(0, combinedBuf.length - TAG_BYTES);
    const tag = combinedBuf.subarray(combinedBuf.length - TAG_BYTES);
    const decipher = QuickCrypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(key),
      Buffer.from(iv)
    );
    decipher.setAuthTag(tag as Buffer);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return new Uint8Array(plaintext);
  }
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

  if (QuickCrypto) {
    const hmacInstance = QuickCrypto.createHmac('sha256', Buffer.from(dek));
    hmacInstance.update(Buffer.from(plaintextBytes));
    return toBase64(new Uint8Array(hmacInstance.digest()));
  }

  return toBase64(new Uint8Array(hmac(sha256, dek, plaintextBytes)));
}
