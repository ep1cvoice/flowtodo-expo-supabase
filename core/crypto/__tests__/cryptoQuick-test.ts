// Quick-crypto path: PBKDF2 must use the async (off-JS-thread) variant, never pbkdf2Sync.
import type { Buffer } from 'buffer';

import { decryptDek, encryptDekWithPassword } from '@/core/crypto/index.native';
const mockPbkdf2Sync = jest.fn();
jest.mock('react-native-quick-crypto', () => {
  const nodeCrypto = jest.requireActual('crypto');
  return {
    randomBytes: (n: number) => nodeCrypto.randomBytes(n),
    pbkdf2: (
      password: string,
      salt: Buffer,
      iterations: number,
      keylen: number,
      digest: string,
      cb: (err: Error | null, key?: Buffer) => void
    ) => nodeCrypto.pbkdf2(password, salt, iterations, keylen, digest, cb),
    pbkdf2Sync: (...args: unknown[]) => mockPbkdf2Sync(...args),
    createCipheriv: (...a: unknown[]) => (nodeCrypto.createCipheriv as any)(...a),
    createDecipheriv: (...a: unknown[]) => (nodeCrypto.createDecipheriv as any)(...a),
    createHmac: (...a: unknown[]) => (nodeCrypto.createHmac as any)(...a),
  };
});
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));

it('round-trips the DEK through the async quick-crypto PBKDF2 without calling pbkdf2Sync', async () => {
  const dek = new Uint8Array(32).fill(5);
  const m = await encryptDekWithPassword(dek, 'pw');
  const out = await decryptDek('pw', m.salt, m.encryptedDek, m.dekIv, m.kdfIterations);
  expect(Array.from(out)).toEqual(Array.from(dek));
  expect(mockPbkdf2Sync).not.toHaveBeenCalled();
}, 30000);
