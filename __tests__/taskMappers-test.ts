jest.mock('@/lib/crypto', () => ({
  decryptField: jest.fn((_dek: Uint8Array, enc: string) => {
    if (enc === 'broken') throw new Error('bad tag');
    return `dec:${enc}`;
  }),
}));

import { mapCategory, mapTag, mapTask } from '@/lib/tasks/taskMappers';

const dek = new Uint8Array(32);

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

const tagRow = (over: Record<string, unknown> = {}): any => ({
  id: '1',
  name: 'plain',
  name_enc: 'tag_enc',
  name_iv: 'iv',
  color: '#fff',
  ...over,
});

const taskRow = (over: Record<string, unknown> = {}): any => ({
  id: '5',
  title: '',
  title_enc: 'title_enc',
  title_iv: 'iv',
  description: '',
  description_enc: 'desc_enc',
  description_iv: 'iv',
  done: false,
  scheduled: null,
  completed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  category_id: '3',
  sort_order: 2,
  categories: null,
  task_tags: [],
  ...over,
});

describe('mapTag / mapCategory', () => {
  it('decrypts the name when a DEK and *_enc fields are present', () => {
    expect(mapTag(tagRow(), dek)).toEqual({ id: 1, name: 'dec:tag_enc', color: '#fff' });
  });

  it('falls back to the plaintext column without a DEK', () => {
    expect(mapTag(tagRow(), null).name).toBe('plain');
  });

  it('falls back to plaintext when decryption fails, without throwing', () => {
    expect(mapTag(tagRow({ name_enc: 'broken' }), dek).name).toBe('plain');
  });

  it('mapCategory keeps color and icon', () => {
    const row: any = { id: '2', name: 'x', name_enc: 'c_enc', name_iv: 'iv', color: '#000', icon: 'Home' };
    expect(mapCategory(row, dek)).toEqual({ id: 2, name: 'dec:c_enc', color: '#000', icon: 'Home' });
  });
});

describe('mapTask', () => {
  it('decrypts title and description and converts ids to numbers', () => {
    const task = mapTask(taskRow(), dek);
    expect(task).toMatchObject({
      id: 5,
      title: 'dec:title_enc',
      description: 'dec:desc_enc',
      categoryId: 3,
      sortOrder: 2,
      completedAt: null,
      created: '2026-01-01T00:00:00Z',
      category: null,
      tags: [],
    });
  });

  it('maps tags and skips empty links', () => {
    const task = mapTask(
      taskRow({ task_tags: [{ tags: tagRow({ id: '9' }) }, { tags: null }] }),
      dek
    );
    expect(task.tags).toEqual([{ id: 9, name: 'dec:tag_enc', color: '#fff' }]);
  });

  it('task without a category → categoryId is null', () => {
    expect(mapTask(taskRow({ category_id: null }), dek).categoryId).toBeNull();
  });

  it('locked session (dek = null) shows the plaintext columns', () => {
    const task = mapTask(taskRow({ title: 'old title', description: 'old description' }), null);
    expect(task.title).toBe('old title');
    expect(task.description).toBe('old description');
  });
});
