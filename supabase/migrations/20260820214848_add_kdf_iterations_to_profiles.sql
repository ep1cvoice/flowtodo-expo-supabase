ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS kdf_iterations INT NOT NULL DEFAULT 50000;

COMMENT ON COLUMN profiles.kdf_iterations IS 'Liczba iteracji PBKDF2 użyta do wyprowadzenia KEK dla tego usera';
