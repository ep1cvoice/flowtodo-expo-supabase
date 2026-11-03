import { callsOf, createBuilder, flushPromises } from '@/test/supabaseMock';

jest.mock('@/supabase/client', () => ({
  supabase: { from: jest.fn(), auth: { signInWithPassword: jest.fn() } },
}));
jest.mock('@/lib/auth/constants', () => ({
  LEGACY_KDF_ITERATIONS: 100000,
  PROFILE_FETCH_TIMEOUT_MS: 1000,
  PROFILE_RETRY_ATTEMPTS: 3,
  PROFILE_RETRY_DELAY_MS: 0,
}));
jest.mock('@/lib/crypto', () => ({
  CURRENT_PBKDF2_ITERATIONS: 210000,
  decryptDek: jest.fn(),
  encryptDekWithPassword: jest.fn(),
  generateEncryptionMaterial: jest.fn(),
}));
jest.mock('@/lib/crypto/migrateEncryption', () => ({
  migrateUserEncryption: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/retry', () => ({ withRetry: (fn: () => Promise<unknown>) => fn() }));
jest.mock('@/lib/withTimeout', () => ({ withTimeout: (p: Promise<unknown>) => p }));

import {
  decryptDek,
  encryptDekWithPassword,
  generateEncryptionMaterial,
} from '@/lib/crypto';
import { migrateUserEncryption } from '@/lib/crypto/migrateEncryption';
import { supabase } from '@/supabase/client';
import { resolveDekFromPassword } from '@/lib/auth/dek';

const from = supabase.from as jest.Mock;
const signIn = supabase.auth.signInWithPassword as jest.Mock;
const decrypt = decryptDek as jest.Mock;

const options = {
  userId: 'u1',
  password: 'pw',
  profileTimeoutLabel: 'profile',
  decryptFailLog: 'decrypt failed',
  decryptFailError: 'Wrong password',
};
const material = (kdf_iterations: number | null = 210000) => ({
  salt: 's',
  encrypted_dek: 'e',
  dek_iv: 'i',
  kdf_iterations,
});
const theDek = new Uint8Array([1, 2, 3]);

beforeEach(() => {
  jest.clearAllMocks();
  from.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  decrypt.mockResolvedValue(theDek);
});

describe('resolveDekFromPassword', () => {
  it('returns the DEK and starts the background migration', async () => {
    from.mockReturnValueOnce(createBuilder({ data: material() }));

    const res = await resolveDekFromPassword(options);

    expect(res).toEqual({ ok: true, dek: theDek });
    expect(decrypt).toHaveBeenCalledWith('pw', 's', 'e', 'i', 210000);
    expect(migrateUserEncryption).toHaveBeenCalledWith('u1', theDek);
  });

  it('returns a readable error when the profile fetch fails', async () => {
    from.mockReturnValueOnce(createBuilder({ error: { message: 'x' } }));
    expect(await resolveDekFromPassword(options)).toEqual({
      ok: false,
      error: 'Unable to fetch encryption profile data',
    });
  });

  it('returns decryptFailError when decryptDek throws (wrong password)', async () => {
    from.mockReturnValueOnce(createBuilder({ data: material() }));
    decrypt.mockRejectedValueOnce(new Error('bad tag'));
    expect(await resolveDekFromPassword(options)).toEqual({
      ok: false,
      error: 'Wrong password',
    });
  });

  it('falls back to LEGACY_KDF_ITERATIONS when kdf_iterations is missing', async () => {
    from.mockReturnValueOnce(createBuilder({ data: material(null) }));
    from.mockReturnValue(createBuilder()); // background upgrade
    (encryptDekWithPassword as jest.Mock).mockResolvedValue({
      salt: 's2',
      encryptedDek: 'e2',
      dekIv: 'i2',
      kdfIterations: 210000,
    });

    await resolveDekFromPassword(options);

    expect(decrypt).toHaveBeenCalledWith('pw', 's', 'e', 'i', 100000);
  });

  describe('background KDF iterations upgrade', () => {
    it('re-wraps the DEK in the profile when iterations are outdated', async () => {
      const upgrade = createBuilder();
      from.mockReturnValueOnce(createBuilder({ data: material(100000) })).mockReturnValueOnce(upgrade);
      (encryptDekWithPassword as jest.Mock).mockResolvedValue({
        salt: 's2',
        encryptedDek: 'e2',
        dekIv: 'i2',
        kdfIterations: 210000,
      });

      await resolveDekFromPassword(options);
      await flushPromises();

      expect(callsOf(upgrade, 'update')[0][0]).toEqual({
        salt: 's2',
        encrypted_dek: 'e2',
        dek_iv: 'i2',
        kdf_iterations: 210000,
      });
      expect(callsOf(upgrade, 'eq')[0]).toEqual(['id', 'u1']);
    });

    it('makes no extra query when iterations are already current', async () => {
      from.mockReturnValueOnce(createBuilder({ data: material(210000) }));
      await resolveDekFromPassword(options);
      await flushPromises();
      expect(from).toHaveBeenCalledTimes(1);
    });

    it('does not break sign-in when the upgrade fails', async () => {
      from
        .mockReturnValueOnce(createBuilder({ data: material(100000) }))
        .mockReturnValueOnce(createBuilder({ error: { message: 'fail' } }));
      (encryptDekWithPassword as jest.Mock).mockResolvedValue({
        salt: 's2', encryptedDek: 'e2', dekIv: 'i2', kdfIterations: 210000,
      });

      const res = await resolveDekFromPassword(options);
      await flushPromises();

      expect(res.ok).toBe(true);
    });
  });

  describe('profile without DEK (backfill)', () => {
    const empty = { salt: null, encrypted_dek: null, dek_iv: null, kdf_iterations: null };
    const generated = {
      salt: 'gs',
      encryptedDek: 'ge',
      dekIv: 'gi',
      kdfIterations: 210000,
    };

    it('rejected password in Auth → "Invalid password", no DEK generated', async () => {
      from.mockReturnValueOnce(createBuilder({ data: empty }));
      signIn.mockResolvedValue({ error: { code: 'invalid_credentials' } });

      const res = await resolveDekFromPassword({ ...options, verifyEmail: 'a@b.com' });

      expect(res).toEqual({ ok: false, error: 'Invalid password' });
      expect(generateEncryptionMaterial).not.toHaveBeenCalled();
    });

    it('correct password → generates material, saves it and decrypts with it', async () => {
      const update = createBuilder({ data: [{ id: 'u1' }] });
      from.mockReturnValueOnce(createBuilder({ data: empty })).mockReturnValueOnce(update);
      signIn.mockResolvedValue({ error: null });
      (generateEncryptionMaterial as jest.Mock).mockResolvedValue(generated);

      const res = await resolveDekFromPassword({ ...options, verifyEmail: 'a@b.com' });

      expect(res).toEqual({ ok: true, dek: theDek });
      expect(callsOf(update, 'update')[0][0]).toMatchObject({ salt: 'gs', encrypted_dek: 'ge' });
      expect(decrypt).toHaveBeenCalledWith('pw', 'gs', 'ge', 'gi', 210000);
    });

    it('profile row not ready yet (empty update result) → configuration error', async () => {
      from
        .mockReturnValueOnce(createBuilder({ data: empty }))
        .mockReturnValueOnce(createBuilder({ data: [] }));
      (generateEncryptionMaterial as jest.Mock).mockResolvedValue(generated);

      const res = await resolveDekFromPassword(options);

      expect(res).toEqual({ ok: false, error: 'Unable to configure encryption. Try again.' });
      expect(decrypt).not.toHaveBeenCalled();
    });
  });
});
