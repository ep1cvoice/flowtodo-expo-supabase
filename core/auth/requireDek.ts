export function requireDek(dek: Uint8Array | null): Uint8Array {
  if (!dek) {
    throw new Error('Aplikacja jest zablokowana. Odblokuj ją hasłem, aby zapisać dane.');
  }
  return dek;
}
