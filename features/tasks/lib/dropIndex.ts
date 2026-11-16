/**
 * Target index (in the list after removing the dragged item) for a vertical drag.
 *
 * `mids[i]` is the vertical midpoint of the item at index `i` in the current list, or
 * `undefined` when the item is not mounted (virtualized away). Unmounted items above the
 * first mounted one count as above the pointer, the rest as below it.
 */
export function computeDropIndex(
  fromIndex: number,
  mids: readonly (number | undefined)[],
  pointerY: number
): number {
  const firstMounted = mids.findIndex((mid) => mid !== undefined);
  let target = 0;
  for (let i = 0; i < mids.length; i++) {
    if (i === fromIndex) continue;
    const mid = mids[i];
    const above = mid === undefined ? i < firstMounted : mid < pointerY;
    if (!above) break;
    target++;
  }
  return target;
}

/** Moves the item at `fromIndex` so it ends up at `toIndex` (indices as in computeDropIndex). */
export function moveItem<T>(list: readonly T[], fromIndex: number, toIndex: number): T[] {
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
