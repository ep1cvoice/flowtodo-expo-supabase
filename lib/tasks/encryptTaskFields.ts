import { encryptField } from '@/lib/crypto';

export async function encryptTaskFields(
  dek: Uint8Array,
  title: string,
  description: string
) {
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  const titleEnc = await encryptField(dek, trimmedTitle);
  let descriptionEncFields: { description_enc: string | null; description_iv: string | null } = {
    description_enc: null,
    description_iv: null,
  };
  if (trimmedDescription) {
    const descEnc = await encryptField(dek, trimmedDescription);
    descriptionEncFields = { description_enc: descEnc.ciphertext, description_iv: descEnc.iv };
  }

  return {
    title_enc: titleEnc.ciphertext,
    title_iv: titleEnc.iv,
    ...descriptionEncFields,
  };
}
