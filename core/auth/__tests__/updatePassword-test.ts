// Characterization tests for rewrapDekAndUpdatePassword, including the rollback path.
import { rewrapDekAndUpdatePassword } from '@/core/auth/updatePassword';

type Res = { error: any; data?: any };

const mockState = {
  signIn: { error: null } as Res,
  profile: { data: null, error: null } as Res,
  updateResults: [] as Res[],
  updates: [] as any[],
  updateUser: { error: null } as Res,
};

jest.mock('@/shared/lib/retry', () => ({ withRetry: (fn: () => Promise<unknown>) => fn() }));
jest.mock('@/shared/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/core/crypto', () => ({
  encryptDekWithPassword: jest.fn(async () => ({
    salt: 'new-salt',
    encryptedDek: 'new-dek',
    dekIv: 'new-iv',
    kdfIterations: 600000,
  })),
}));
jest.mock('@/core/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(async () => mockState.signIn),
      updateUser: jest.fn(async () => mockState.updateUser),
    },
    from: jest.fn(() => {
      let result: Res = { error: null, data: [{ id: 'u1' }] };
      const b: any = {
        select: jest.fn(() => b),
        eq: jest.fn(() => b),
        single: jest.fn(async () => mockState.profile),
        update: jest.fn((payload: any) => {
          mockState.updates.push(payload);
          result = mockState.updateResults.shift() ?? { error: null, data: [{ id: 'u1' }] };
          return b;
        }),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
      };
      return b;
    }),
  },
}));

const profile = {
  salt: 'old-salt',
  encrypted_dek: 'old-dek',
  dek_iv: 'old-iv',
  kdf_iterations: 50000,
};

const options = {
  userId: 'u1',
  email: 'a@b.c',
  dek: new Uint8Array(32),
  currentPassword: 'old',
  newPassword: 'new',
};

beforeEach(() => {
  require('@/core/supabase/client').supabase.auth.updateUser.mockClear();
  mockState.signIn = { error: null };
  mockState.profile = { data: profile, error: null };
  mockState.updateResults = [];
  mockState.updates = [];
  mockState.updateUser = { error: null };
});

it('fails without touching the profile when the current password is wrong', async () => {
  mockState.signIn = { error: new Error('bad creds') };
  const { error } = await rewrapDekAndUpdatePassword(options);
  expect(error).toEqual(expect.any(String));
  expect(mockState.updates).toHaveLength(0);
});

it('fails when the profile cannot be read or is incomplete', async () => {
  mockState.profile = { data: null, error: new Error('x') };
  expect((await rewrapDekAndUpdatePassword(options)).error).toEqual(expect.any(String));
  mockState.profile = { data: { ...profile, salt: null }, error: null };
  expect((await rewrapDekAndUpdatePassword(options)).error).toEqual(expect.any(String));
  expect(mockState.updates).toHaveLength(0);
});

it('happy path: writes new wrap with backup, updates auth password, then clears the backup', async () => {
  const { error } = await rewrapDekAndUpdatePassword(options);
  expect(error).toBeNull();
  expect(mockState.updates).toHaveLength(2);
  expect(mockState.updates[0]).toMatchObject({
    salt: 'new-salt',
    encrypted_dek: 'new-dek',
    dek_iv: 'new-iv',
    kdf_iterations: 600000,
    salt_backup: 'old-salt',
    encrypted_dek_backup: 'old-dek',
    dek_iv_backup: 'old-iv',
  });
  expect(mockState.updates[1]).toEqual({
    salt_backup: null,
    encrypted_dek_backup: null,
    dek_iv_backup: null,
  });
});

it('does not change the password when the profile update fails', async () => {
  const { supabase } = require('@/core/supabase/client');
  mockState.updateResults = [{ error: new Error('db down') }];
  const { error } = await rewrapDekAndUpdatePassword(options);
  expect(error).toContain('Password was not changed');
  expect(supabase.auth.updateUser).not.toHaveBeenCalled();
});

it('treats an update that matches no row as a failure', async () => {
  const { supabase } = require('@/core/supabase/client');
  mockState.updateResults = [{ error: null, data: [] }];
  const { error } = await rewrapDekAndUpdatePassword(options);
  expect(error).toContain('Password was not changed');
  expect(supabase.auth.updateUser).not.toHaveBeenCalled();
});

it('rolls back the profile to the old wrap when the auth password update fails', async () => {
  mockState.updateUser = { error: new Error('auth down') };
  const { error } = await rewrapDekAndUpdatePassword(options);
  expect(error).toEqual(expect.any(String));
  expect(error).not.toContain('Critical');
  expect(mockState.updates).toHaveLength(2);
  expect(mockState.updates[1]).toEqual({
    salt: 'old-salt',
    encrypted_dek: 'old-dek',
    dek_iv: 'old-iv',
    kdf_iterations: 50000,
    salt_backup: null,
    encrypted_dek_backup: null,
    dek_iv_backup: null,
  });
});

it('reports a critical error when the rollback also fails', async () => {
  mockState.updateUser = { error: new Error('auth down') };
  mockState.updateResults = [undefined as any, { error: new Error('rollback failed') }];
  const { error } = await rewrapDekAndUpdatePassword(options);
  expect(error).toContain('Critical');
});
