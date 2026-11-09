import { strings } from '@/shared/lib/strings';
export function requireDek(dek: Uint8Array | null): Uint8Array {
  if (!dek) {
    throw new Error(strings.auth.errors.appLocked);
  }
  return dek;
}
