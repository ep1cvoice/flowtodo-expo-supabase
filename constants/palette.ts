/** Shared color swatches for categories and tags. */
export const PALETTE_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
  '#84cc16',
  '#06b6d4',
  '#f43f5e',
] as const;

export type PaletteColor = (typeof PALETTE_COLORS)[number];
