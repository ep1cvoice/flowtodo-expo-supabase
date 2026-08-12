/** Shared Active filter cap (categories + tags combined). */
export const FILTER_LIMIT_DEFAULT = 10;
export const FILTER_LIMIT_MIN = 5;
export const FILTER_LIMIT_MAX = 30;

export function clampFilterLimit(value: number): number {
  if (!Number.isFinite(value)) return FILTER_LIMIT_DEFAULT;
  return Math.min(FILTER_LIMIT_MAX, Math.max(FILTER_LIMIT_MIN, Math.round(value)));
}
