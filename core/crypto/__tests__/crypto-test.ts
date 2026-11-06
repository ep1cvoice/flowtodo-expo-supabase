// Round-trip encryption tests against the real implementation (@noble), no native modules.
// PBKDF2 is swapped for node:crypto (same algorithm, much faster than pure JS).
jest.mock('react-native-quick-crypto', () => {
  throw new Error('native module unavailable in Jest');
});
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: async (n: number) => new Uint8Array(require('crypto').randomBytes(n)),
}));
jest.mock('@noble/hashes/pbkdf2.js', () => ({
  pbkdf2: (_hash: unknown, password: Uint8Array, salt: Uint8Array, opts: { c: number; dkLen: number }) =>
    new Uint8Array(
      require('crypto').pbkdf2Sync(
        require('buffer').Buffer.from(password),
        require('buffer').Buffer.from(salt),
        opts.c,
        opts.dkLen,
        'sha256'
      )
    ),
}));

import { Buffer } from 'buffer';
import {
  CURRENT_PBKDF2_ITERATIONS,
  decryptDek,
  decryptField,
  encryptDekWithPassword,
  encryptField,
  generateEncryptionMaterial,
  hashForUniqueness,
} from '@/core/crypto/index.native';

const dek = new Uint8Array(32).fill(7);
const otherDek = new Uint8Array(32).fill(8);

const flipFirstByte = (b64: string) => {
  const buf = Buffer.from(b64, 'base64');
  buf[0] ^= 1;
  return buf.toString('base64');
};

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('encryptField / decryptField', () => {
  it.each([
    ['plain text', 'Buy milk'],
    ['empty string', ''],
    ['unicode and emoji', 'Zażółć gęślą jaźń 🙂'],
    ['long text', 'a'.repeat(10_000)],
  ])('round-trips: %s', async (_name, plaintext) => {
    const { ciphertext, iv } = await encryptField(dek, plaintext);
    expect(decryptField(dek, ciphertext, iv)).toBe(plaintext);
  });

  it('produces a different ciphertext and IV for the same input (random nonce)', async () => {
    const a = await encryptField(dek, 'same text');
    const b = await encryptField(dek, 'same text');
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('does not leak plaintext in the ciphertext', async () => {
    const { ciphertext } = await encryptField(dek, 'Secret title');
    expect(Buffer.from(ciphertext, 'base64').toString('utf8')).not.toContain('Secret');
  });

  it('throws when decrypting with the wrong DEK', async () => {
    const { ciphertext, iv } = await encryptField(dek, 'secret');
    expect(() => decryptField(otherDek, ciphertext, iv)).toThrow();
  });

  it('throws when the ciphertext was tampered with (GCM detects modification)', async () => {
    const { ciphertext, iv } = await encryptField(dek, 'secret');
    expect(() => decryptField(dek, flipFirstByte(ciphertext), iv)).toThrow();
  });
});

describe('hashForUniqueness', () => {
  it('is deterministic and ignores case and surrounding whitespace', () => {
    expect(hashForUniqueness(dek, 'Work')).toBe(hashForUniqueness(dek, '  work  '));
  });

  it('differs for different text and for a different DEK', () => {
    expect(hashForUniqueness(dek, 'work')).not.toBe(hashForUniqueness(dek, 'home'));
    expect(hashForUniqueness(dek, 'work')).not.toBe(hashForUniqueness(otherDek, 'work'));
  });
});

describe('DEK wrapping (password → KEK → DEK)', () => {
  it('generateEncryptionMaterial → decryptDek returns a 32-byte key', async () => {
    const m = await generateEncryptionMaterial('Secret1!');
    expect(m.kdfIterations).toBe(CURRENT_PBKDF2_ITERATIONS);

    const unwrapped = await decryptDek('Secret1!', m.salt, m.encryptedDek, m.dekIv, m.kdfIterations);
    expect(unwrapped).toHaveLength(32);
  });

  it('throws on the wrong password', async () => {
    const m = await generateEncryptionMaterial('Secret1!');
    await expect(
      decryptDek('Wrong1!', m.salt, m.encryptedDek, m.dekIv, m.kdfIterations)
    ).rejects.toThrow();
  });

  it('re-wrapping with a new password keeps the same DEK (existing data still decrypts)', async () => {
    const m = await generateEncryptionMaterial('Old1!pass');
    const unwrapped = await decryptDek('Old1!pass', m.salt, m.encryptedDek, m.dekIv, m.kdfIterations);
    const field = await encryptField(unwrapped, 'task from before the password change');

    const re = await encryptDekWithPassword(unwrapped, 'New1!pass');
    expect(re.salt).not.toBe(m.salt);

    const unwrappedAgain = await decryptDek('New1!pass', re.salt, re.encryptedDek, re.dekIv, re.kdfIterations);
    expect(Array.from(unwrappedAgain)).toEqual(Array.from(unwrapped));
    expect(decryptField(unwrappedAgain, field.ciphertext, field.iv)).toBe(
      'task from before the password change'
    );
  });
});
