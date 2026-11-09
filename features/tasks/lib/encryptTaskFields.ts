import { encryptedColumns } from '@/core/crypto/encryptedColumns';

export async function encryptTaskFields(
  dek: Uint8Array,
  title: string,
  description: string
) {
  return {
    ...(await encryptedColumns(dek, 'title', title)),
    ...(await encryptedColumns(dek, 'description', description, { emptyAsNull: true })),
  };
}
