import { useState } from 'react';

// Latches to true the first time `visible` becomes true and never goes back, so a modal can be
// left unmounted until first opened yet stay mounted afterwards (closing animations still play).
export function useMountOnFirstOpen(visible: boolean): boolean {
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  return mounted || visible;
}
