/** Formats seconds as m:ss, clamped at zero. */
export function formatClock(total: number): string {
  const safe = Math.max(0, Math.floor(total));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}
