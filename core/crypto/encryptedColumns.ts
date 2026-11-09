import { encryptField, hashForUniqueness } from '@/core/crypto';

type EncCols<K extends string> = Record<`${K}_enc` | `${K}_iv`, string>;
type NullableEncCols<K extends string> = Record<`${K}_enc` | `${K}_iv`, string | null>;
type HashCol<K extends string> = Record<`${K}_hash`, string>;

export async function encryptedColumns<K extends string>(
  dek: Uint8Array,
  key: K,
  value: string
): Promise<EncCols<K>>;
export async function encryptedColumns<K extends string>(
  dek: Uint8Array,
  key: K,
  value: string,
  opts: { hash: true }
): Promise<EncCols<K> & HashCol<K>>;
export async function encryptedColumns<K extends string>(
  dek: Uint8Array,
  key: K,
  value: string,
  opts: { emptyAsNull: true }
): Promise<NullableEncCols<K>>;
export async function encryptedColumns(
  dek: Uint8Array,
  key: string,
  value: string,
  opts: { hash?: boolean; emptyAsNull?: boolean } = {}
): Promise<Record<string, string | null>> {
  const text = value.trim();

  if (!text && opts.emptyAsNull) {
    return { [`${key}_enc`]: null, [`${key}_iv`]: null };
  }

  const { ciphertext, iv } = await encryptField(dek, text);
  return {
    [`${key}_enc`]: ciphertext,
    [`${key}_iv`]: iv,
    ...(opts.hash ? { [`${key}_hash`]: hashForUniqueness(dek, text) } : {}),
  };
}
