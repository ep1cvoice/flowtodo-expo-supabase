import type { Task } from '@/types';

/**
 * Merge a reordered filtered list back into the full active list,
 * keeping non-filtered tasks in their original slots.
 */
export function applyFilteredReorder(
  fullActive: Task[],
  reorderedFiltered: Task[]
): Task[] {
  const filteredIds = new Set(reorderedFiltered.map((task) => task.id));
  const slots = fullActive
    .map((task, index) => (filteredIds.has(task.id) ? index : -1))
    .filter((index) => index >= 0);

  if (slots.length !== reorderedFiltered.length) {
    return reorderedFiltered;
  }

  const next = [...fullActive];
  slots.forEach((slotIndex, i) => {
    next[slotIndex] = reorderedFiltered[i];
  });
  return next;
}
