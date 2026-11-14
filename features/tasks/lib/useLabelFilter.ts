import { strings } from '@/shared/lib/strings';
import { useCallback, useMemo, useState } from 'react';
import { useToast } from '@/shared/providers/ToastContext';
import type { Category, Tag } from '@/types';

/**
 * Category / tag selection, limited to `maxSelections` in total. Ids of labels that no longer
 * exist are kept in the raw selection but dropped from `validCategoryIds` / `validTagIds`.
 */
export function useLabelFilter(categories: Category[], tags: Tag[], maxSelections: number) {
  const { showToast } = useToast();
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // When the limit changes, trim the selection while rendering: categories first, tags get
  // the rest.
  const [prevMax, setPrevMax] = useState(maxSelections);
  if (maxSelections !== prevMax) {
    setPrevMax(maxSelections);
    const nextCats =
      selectedCategoryIds.length > maxSelections
        ? selectedCategoryIds.slice(0, maxSelections)
        : selectedCategoryIds;
    if (nextCats !== selectedCategoryIds) setSelectedCategoryIds(nextCats);

    const room = maxSelections - nextCats.length;
    if (selectedTagIds.length > room) setSelectedTagIds(selectedTagIds.slice(0, room));
  }

  const handleToggleCategory = useCallback(
    (id: number) => {
      if (selectedCategoryIds.includes(id)) {
        setSelectedCategoryIds((prev) => prev.filter((x) => x !== id));
        return;
      }
      if (selectedCategoryIds.length + selectedTagIds.length >= maxSelections) {
        showToast(strings.tasks.filterLimitReached(maxSelections), 'error');
        return;
      }
      setSelectedCategoryIds((prev) => [...prev, id]);
    },
    [maxSelections, selectedCategoryIds, selectedTagIds.length, showToast]
  );

  const handleToggleTag = useCallback(
    (id: number) => {
      if (selectedTagIds.includes(id)) {
        setSelectedTagIds((prev) => prev.filter((x) => x !== id));
        return;
      }
      if (selectedCategoryIds.length + selectedTagIds.length >= maxSelections) {
        showToast(strings.tasks.filterLimitReached(maxSelections), 'error');
        return;
      }
      setSelectedTagIds((prev) => [...prev, id]);
    },
    [maxSelections, selectedCategoryIds.length, selectedTagIds, showToast]
  );

  const validCategoryIds = useMemo(
    () => selectedCategoryIds.filter((id) => categories.some((c) => c.id === id)),
    [selectedCategoryIds, categories]
  );
  const validTagIds = useMemo(
    () => selectedTagIds.filter((id) => tags.some((t) => t.id === id)),
    [selectedTagIds, tags]
  );

  const clearFilters = useCallback(() => {
    setSelectedCategoryIds([]);
    setSelectedTagIds([]);
  }, []);

  return {
    selectedCategoryIds,
    selectedTagIds,
    validCategoryIds,
    validTagIds,
    hasFilters: validCategoryIds.length > 0 || validTagIds.length > 0,
    handleToggleCategory,
    handleToggleTag,
    clearFilters,
    setSelectedCategoryIds,
    setSelectedTagIds,
  };
}
