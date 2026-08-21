import QuickCrypto from 'react-native-quick-crypto';

export interface EncryptedField {
  ciphertext: string; // Base64
  iv: string;         // Base64
}

const SALT_BYTES = 16;
const DEK_BYTES = 32; // AES-256
const IV_BYTES = 12;  // standard dla GCM
const TAG_BYTES = 16; // AES-GCM auth tag
const PBKDF2_ITERATIONS = 250_000; // for mobile
export const CURRENT_PBKDF2_ITERATIONS = PBKDF2_ITERATIONS;

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function randomBytes(length: number): Promise<Uint8Array> {
  return new Uint8Array(QuickCrypto.randomBytes(length));
}

/**
 * Wyprowadza klucz szyfrujący (KEK) z hasła użytkownika za pomocą PBKDF2.
 * Natywna implementacja (OpenSSL przez JSI) — dużo szybsza niż pure-JS.
 */
function deriveKeyFromPassword(password: string, salt: Uint8Array, iterations: number): Uint8Array {
  const derived = QuickCrypto.pbkdf2Sync(
    password,
    Buffer.from(salt),
    iterations,
    DEK_BYTES,
    'sha256'
  );
  return new Uint8Array(derived);
}

/** AES-256-GCM encrypt, zwraca ciphertext z doklejonym tagiem (kompatybilne z @noble/ciphers). */
function gcmEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array {
  const cipher = QuickCrypto.createCipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv));
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
  const tag = cipher.getAuthTag();
  return new Uint8Array(Buffer.concat([ciphertext, tag]));
}

/** AES-256-GCM decrypt, oczekuje ciphertextu z doklejonym tagiem na końcu. */
function gcmDecrypt(key: Uint8Array, iv: Uint8Array, combined: Uint8Array): Uint8Array {
  const combinedBuf = Buffer.from(combined);
  const ciphertext = combinedBuf.subarray(0, combinedBuf.length - TAG_BYTES);
  const tag = combinedBuf.subarray(combinedBuf.length - TAG_BYTES);

  const decipher = QuickCrypto.createDecipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv));
  decipher.setAuthTag(tag as any);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return new Uint8Array(plaintext);
}

export interface EncryptionMaterial {
  salt: string;
  encryptedDek: string;
  dekIv: string;
  kdfIterations: number;
}

/**
 * Generuje nowy losowy DEK (klucz danych) i szyfruje go kluczem
 * wyprowadzonym z hasła użytkownika (KEK) przy pomocy AES-256-GCM.
 */
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

  const kek = deriveKeyFromPassword(password, saltBytes, PBKDF2_ITERATIONS);
  const encryptedDekBytes = gcmEncrypt(kek, ivBytes, dek);

  return {
    salt: toBase64(saltBytes),
    encryptedDek: toBase64(encryptedDekBytes),
    dekIv: toBase64(ivBytes),
    kdfIterations: PBKDF2_ITERATIONS,
  };
}

/**
 * Odszyfrowuje DEK przy logowaniu - potrzebne hasło, salt i dekIv z profilu.
 */
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

/**
 * Szyfruje pojedyncze pole tekstowe (np. tytuł, opis, nazwę) kluczem DEK.
 * Każde wywołanie generuje nowy losowy IV - nigdy nie reużywaj IV.
 */
export async function encryptField(dek: Uint8Array, plaintext: string): Promise<EncryptedField> {
  const ivBytes = await randomBytes(IV_BYTES);
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const ciphertextBytes = gcmEncrypt(dek, ivBytes, plaintextBytes);

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
  const plaintextBytes = gcmDecrypt(dek, iv, ciphertext);
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
  const hmacInstance = QuickCrypto.createHmac('sha256', Buffer.from(dek));
  hmacInstance.update(Buffer.from(plaintextBytes));
  const hashBytes = hmacInstance.digest();
  return toBase64(new Uint8Array(hashBytes));
}
