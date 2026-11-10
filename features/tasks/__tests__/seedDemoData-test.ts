import { callsOf, createBuilder } from '@/test/supabaseMock';

jest.mock('@/core/supabase/client', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
jest.mock('@/core/crypto', () => ({
  encryptField: jest.fn(async (_dek: Uint8Array, text: string) => ({
    ciphertext: `ct(${text})`,
    iv: 'iv',
  })),
  hashForUniqueness: jest.fn((_dek: Uint8Array, text: string) => `h(${text})`),
}));

import { supabase } from '@/core/supabase/client';
import { DEMO_CATEGORIES, DEMO_TAGS, DEMO_TASKS } from '@/features/tasks/lib/demoSeed';
import { seedDemoData } from '@/features/tasks/lib/seedDemoData';

const from = supabase.from as jest.Mock;
const rpc = supabase.rpc as jest.Mock;
const dek = new Uint8Array(32);

beforeEach(() => {
  jest.clearAllMocks();
  from.mockReset();
  rpc.mockReset();
});

describe('seedDemoData', () => {
  it('does nothing when the account was already seeded', async () => {
    from.mockReturnValue(createBuilder({ data: { demo_seeded_at: '2026-01-01T00:00:00Z' } }));

    await expect(seedDemoData('u1', dek)).resolves.toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('sends everything encrypted in a single RPC and reports it', async () => {
    const profile = createBuilder({ data: { demo_seeded_at: null } });
    from.mockReturnValue(profile);
    rpc.mockResolvedValue({ data: true, error: null });

    await expect(seedDemoData('u1', dek)).resolves.toBe(true);

    expect(callsOf(profile, 'eq')[0]).toEqual(['id', 'u1']);
    expect(rpc).toHaveBeenCalledTimes(1);
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe('seed_demo_data');
    expect(args.p_categories).toHaveLength(DEMO_CATEGORIES.length);
    expect(args.p_tags).toHaveLength(DEMO_TAGS.length);
    expect(args.p_tasks.map((t: any) => t.sort_order)).toEqual(DEMO_TASKS.map((t) => t.sortOrder));
    expect(args.p_categories[0]).toMatchObject({
      key: 'work',
      name_enc: 'ct(Work)',
      name_hash: 'h(Work)',
    });
    expect(args.p_tasks[0]).toMatchObject({ title_enc: 'ct(Answer emails)', category_key: 'work' });
    // No plaintext columns are sent.
    expect(args.p_tasks[0]).not.toHaveProperty('title');
    expect(args.p_categories[0]).not.toHaveProperty('name');
  });

  it('propagates an RPC error (nothing is partially seeded: the RPC is atomic)', async () => {
    from.mockReturnValue(createBuilder({ data: { demo_seeded_at: null } }));
    const err = new Error('boom');
    rpc.mockResolvedValue({ data: null, error: err });

    await expect(seedDemoData('u1', dek)).rejects.toBe(err);
  });
});
