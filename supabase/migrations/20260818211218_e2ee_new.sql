ALTER TABLE profiles
  ADD COLUMN salt TEXT,
  ADD COLUMN encrypted_dek TEXT,
  ADD COLUMN dek_iv TEXT;

COMMENT ON COLUMN profiles.salt IS 'Losowa sól dla KDF (Base64)';
COMMENT ON COLUMN profiles.encrypted_dek IS 'Zaszyfrowany klucz DEK (Base64)';
COMMENT ON COLUMN profiles.dek_iv IS 'IV użyty do zaszyfrowania DEK (Base64)';
