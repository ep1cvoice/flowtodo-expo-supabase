import { openUserDb } from '@/core/localdb/openUserDb';
import { withFallback } from '@/features/tasks/lib/store/fallbackStore';
import { localTaskStore } from '@/features/tasks/lib/store/localStore';
import { remoteTaskStore } from '@/features/tasks/lib/store/remoteStore';

/**
 * expo-sqlite on web (wa-sqlite) needs SharedArrayBuffer, i.e. a cross-origin isolated page
 * (COOP/COEP headers, see metro.config.js and vercel.json), plus OPFS for persistence.
 * Without them (or during static rendering, where there is no `window`) the web build stays
 * online-only.
 */
const canUseLocalDb =
  typeof window !== 'undefined' &&
  window.crossOriginIsolated === true &&
  typeof SharedArrayBuffer !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  typeof navigator.storage?.getDirectory === 'function';

export const taskStore = canUseLocalDb
  ? withFallback(localTaskStore, remoteTaskStore, openUserDb)
  : remoteTaskStore;
