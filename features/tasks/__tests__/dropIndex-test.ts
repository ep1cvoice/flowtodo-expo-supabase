import { computeDropIndex, moveItem } from '@/features/tasks/lib/dropIndex';

describe('computeDropIndex', () => {
  // Rows 50px tall: mids at 25, 75, 125, 175.
  const mids = [25, 75, 125, 175];

  it('keeps the position when the pointer stays over the dragged row', () => {
    expect(computeDropIndex(1, mids, 80)).toBe(1);
  });

  it('moves down past rows whose midpoint is above the pointer', () => {
    expect(computeDropIndex(0, mids, 130)).toBe(2);
    expect(computeDropIndex(0, mids, 500)).toBe(3);
  });

  it('moves up to the top', () => {
    expect(computeDropIndex(3, mids, 0)).toBe(0);
    expect(computeDropIndex(3, mids, 80)).toBe(2);
  });

  it('treats unmounted rows before the window as above and after it as below', () => {
    const partial = [undefined, undefined, 125, 175, undefined];
    expect(computeDropIndex(3, partial, 0)).toBe(2);
    expect(computeDropIndex(2, partial, 1000)).toBe(3);
  });
});

describe('moveItem', () => {
  it('moves an item to the target index', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  });
});
