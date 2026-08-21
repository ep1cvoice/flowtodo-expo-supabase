ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS salt_backup TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_dek_backup TEXT,
  ADD COLUMN IF NOT EXISTS dek_iv_backup TEXT;

COMMENT ON COLUMN profiles.salt_backup IS 'Poprzednia sól — zapasowa kopia na czas zmiany hasła (Base64)';
COMMENT ON COLUMN profiles.encrypted_dek_backup IS 'Poprzedni zaszyfrowany DEK — zapasowa kopia na czas zmiany hasła (Base64)';
COMMENT ON COLUMN profiles.dek_iv_backup IS 'Poprzedni IV — zapasowa kopia na czas zmiany hasła (Base64)';
