/**
 * Registry for an optional out-of-process PBKDF2 implementation (the hidden
 * WebView in Pbkdf2WebView). Replaces a global variable so both sides are typed.
 */
export type Pbkdf2Provider = (
  password: string,
  saltBase64: string,
  iterations: number
) => Promise<string>;

let provider: Pbkdf2Provider | null = null;

export function registerPbkdf2Provider(next: Pbkdf2Provider): void {
  provider = next;
}

/** Only removes the provider if it is still the registered one (safe against remount races). */
export function unregisterPbkdf2Provider(current: Pbkdf2Provider): void {
  if (provider === current) provider = null;
}

export function getPbkdf2Provider(): Pbkdf2Provider | null {
  return provider;
}
