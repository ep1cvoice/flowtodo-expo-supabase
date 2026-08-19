import * as ExpoCrypto from 'expo-crypto';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { gcm } from '@noble/ciphers/aes';
import { hmac } from '@noble/hashes/hmac.js';

export interface EncryptedField {
  ciphertext: string; // Base64
  iv: string;         // Base64
}

const SALT_BYTES = 16;
const DEK_BYTES = 32; // AES-256
const IV_BYTES = 12;  // standard dla GCM
const PBKDF2_ITERATIONS = 210_000; // zalecenie OWASP 2024 dla SHA-256

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function randomBytes(length: number): Promise<Uint8Array> {
  return await ExpoCrypto.getRandomBytesAsync(length);
}

/**
 *  Wyprowadza klucz szyfrujący (KEK) z hasła użytkownika za pomocą PBKDF2.
 */
function deriveKeyFromPassword(password: string, salt: Uint8Array): Uint8Array {
  return pbkdf2(sha256, password, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: DEK_BYTES,
  });
}

export interface EncryptionMaterial {
  salt: string;
  encryptedDek: string;
  dekIv: string;
}

/**
 * Generuje nowy losowy DEK (klucz danych) i szyfruje go kluczem
 * wyprowadzonym z hasła użytkownika (KEK) przy pomocy AES-256-GCM.
 */
export async function generateEncryptionMaterial(password: string): Promise<EncryptionMaterial> {
  const saltBytes = await randomBytes(SALT_BYTES);
  const dekBytes = await randomBytes(DEK_BYTES);
  const ivBytes = await randomBytes(IV_BYTES);

  const kek = deriveKeyFromPassword(password, saltBytes);
  const cipher = gcm(kek, ivBytes);
  const encryptedDekBytes = cipher.encrypt(dekBytes);

  return {
    salt: toBase64(saltBytes),
    encryptedDek: toBase64(encryptedDekBytes),
    dekIv: toBase64(ivBytes),
  };
}

/**
 * Szyfruje istniejący (już odszyfrowany) DEK nowym hasłem.
 * Używane przy zmianie hasła - nie generuje nowego DEK, tylko re-wrapuje istniejący.
 */
export async function encryptDekWithPassword(
  dek: Uint8Array,
  password: string
): Promise<EncryptionMaterial> {
  const saltBytes = await randomBytes(SALT_BYTES);
  const ivBytes = await randomBytes(IV_BYTES);

  const kek = deriveKeyFromPassword(password, saltBytes);
  const cipher = gcm(kek, ivBytes);
  const encryptedDekBytes = cipher.encrypt(dek);

  return {
    salt: toBase64(saltBytes),
    encryptedDek: toBase64(encryptedDekBytes),
    dekIv: toBase64(ivBytes),
  };
}

/**
 * Odszyfrowuje DEK przy logowaniu - potrzebne hasło, salt i dekIv z profilu.
 */
export function decryptDek(
  password: string,
  saltB64: string,
  encryptedDekB64: string,
  dekIvB64: string
): Uint8Array {
  const salt = fromBase64(saltB64);
  const iv = fromBase64(dekIvB64);
  const encryptedDek = fromBase64(encryptedDekB64);

  const kek = deriveKeyFromPassword(password, salt);
  const cipher = gcm(kek, iv);

  return cipher.decrypt(encryptedDek); // returns error when password/tag is not matching
}

/**
 * Szyfruje pojedyncze pole tekstowe (np. tytuł, opis, nazwę) kluczem DEK.
 * Każde wywołanie generuje nowy losowy IV - nigdy nie reużywaj IV.
 */
export async function encryptField(dek: Uint8Array, plaintext: string): Promise<EncryptedField> {
  const ivBytes = await randomBytes(IV_BYTES);
  const cipher = gcm(dek, ivBytes);
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const ciphertextBytes = cipher.encrypt(plaintextBytes);

  return {
    ciphertext: toBase64(ciphertextBytes),
    iv: toBase64(ivBytes),
  };
}

/**
 * Odszyfrowuje pole zaszyfrowane przez encryptField.
 * Rzuca błąd jeśli DEK się nie zgadza lub dane są uszkodzone (tag GCM nie pasuje).
 */
export function decryptField(dek: Uint8Array, ciphertextB64: string, ivB64: string): string {
  const ciphertext = fromBase64(ciphertextB64);
  const iv = fromBase64(ivB64);
  const cipher = gcm(dek, iv);
  const plaintextBytes = cipher.decrypt(ciphertext);

  return new TextDecoder().decode(plaintextBytes);
}

/**
 * Deterministyczny hash pola do sprawdzania unikalności/duplikatów bez odszyfrowywania
 * (np. czy user już ma tag o takiej nazwie). HMAC z DEK jako kluczem -
 * ten sam plaintext zawsze da ten sam hash, ale hash nie zdradza treści
 * i nie da się go policzyć bez znajomości DEK (chroni przed rainbow table).
 */
export function hashForUniqueness(dek: Uint8Array, plaintext: string): string {
  const normalized = plaintext.trim().toLowerCase();
  const plaintextBytes = new TextEncoder().encode(normalized);
  const hashBytes = hmac(sha256, dek, plaintextBytes);
  return toBase64(hashBytes);
}
