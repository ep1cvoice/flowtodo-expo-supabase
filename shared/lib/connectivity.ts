// Kept free of native imports so any module (and its tests) can read connectivity.
let knownOnline = true;

/** Fed by NetworkProvider so non-React code (the sync engine) can read connectivity instantly. */
export function setKnownOnline(online: boolean) {
  knownOnline = online;
}

/** Synchronous: true only when the device is known to have no connection. */
export function isKnownOffline(): boolean {
  return !knownOnline;
}
