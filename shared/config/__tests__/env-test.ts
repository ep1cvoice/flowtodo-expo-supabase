const KEYS = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'] as const;
const saved = { ...process.env };

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  jest.resetModules();
});

describe('env', () => {
  it('exposes the variables when present', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    const { env } = jest.requireActual<typeof import('@/shared/config/env')>('@/shared/config/env');
    expect(env).toEqual({ supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon' });
  });

  it.each(KEYS)('throws a readable error when %s is missing', (missing) => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    delete process.env[missing];
    expect(() => jest.requireActual<typeof import('@/shared/config/env')>('@/shared/config/env')).toThrow(missing);
  });
});
