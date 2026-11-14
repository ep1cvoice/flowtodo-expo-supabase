/**
 * expo-sqlite on web (wa-sqlite) needs SharedArrayBuffer, i.e. a cross-origin isolated page
 * (COOP/COEP headers, see metro.config.js and vercel.json), plus OPFS for persistence.
 * Without them (or during static rendering, where there is no `window`) the web build stays
 * online-only.
 */
export const canUseLocalDb =
  typeof window !== 'undefined' &&
  window.crossOriginIsolated === true &&
  typeof SharedArrayBuffer !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  typeof navigator.storage?.getDirectory === 'function';
