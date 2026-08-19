-- ---------------------------------------------------------------------------
-- tasks: title, description
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS title_enc TEXT,
  ADD COLUMN IF NOT EXISTS title_iv TEXT,
  ADD COLUMN IF NOT EXISTS description_enc TEXT,
  ADD COLUMN IF NOT EXISTS description_iv TEXT;

COMMENT ON COLUMN public.tasks.title_enc IS 'Zaszyfrowany tytuł zadania (Base64, AES-256-GCM)';
COMMENT ON COLUMN public.tasks.title_iv IS 'IV użyty do zaszyfrowania tytułu (Base64)';
COMMENT ON COLUMN public.tasks.description_enc IS 'Zaszyfrowany opis zadania (Base64, AES-256-GCM)';
COMMENT ON COLUMN public.tasks.description_iv IS 'IV użyty do zaszyfrowania opisu (Base64)';

-- ---------------------------------------------------------------------------
-- tags: name (+ hash do sprawdzania unikalności bez odszyfrowywania)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS name_enc TEXT,
  ADD COLUMN IF NOT EXISTS name_iv TEXT,
  ADD COLUMN IF NOT EXISTS name_hash TEXT;

COMMENT ON COLUMN public.tags.name_enc IS 'Zaszyfrowana nazwa tagu (Base64, AES-256-GCM)';
COMMENT ON COLUMN public.tags.name_iv IS 'IV użyty do zaszyfrowania nazwy (Base64)';
COMMENT ON COLUMN public.tags.name_hash IS 'HMAC-SHA256(name, DEK) — do sprawdzania unikalności bez odszyfrowywania';

-- Unikalność na hashu, nie na zaszyfrowanej treści (partial index, bo na starcie name_hash bywa NULL)
CREATE UNIQUE INDEX IF NOT EXISTS tags_user_name_hash_unique
  ON public.tags (user_id, name_hash)
  WHERE name_hash IS NOT NULL;

-- ---------------------------------------------------------------------------
-- categories: name (+ hash)
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS name_enc TEXT,
  ADD COLUMN IF NOT EXISTS name_iv TEXT,
  ADD COLUMN IF NOT EXISTS name_hash TEXT;

COMMENT ON COLUMN public.categories.name_enc IS 'Zaszyfrowana nazwa kategorii (Base64, AES-256-GCM)';
COMMENT ON COLUMN public.categories.name_iv IS 'IV użyty do zaszyfrowania nazwy (Base64)';
COMMENT ON COLUMN public.categories.name_hash IS 'HMAC-SHA256(name, DEK) — do sprawdzania unikalności bez odszyfrowywania';

CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_hash_unique
  ON public.categories (user_id, name_hash)
  WHERE name_hash IS NOT NULL;

-- ---------------------------------------------------------------------------
-- pomodoros: task_name
-- ---------------------------------------------------------------------------
ALTER TABLE public.pomodoros
  ADD COLUMN IF NOT EXISTS task_name_enc TEXT,
  ADD COLUMN IF NOT EXISTS task_name_iv TEXT;

COMMENT ON COLUMN public.pomodoros.task_name_enc IS 'Zaszyfrowana nazwa zadania w sesji Pomodoro (Base64, AES-256-GCM)';
COMMENT ON COLUMN public.pomodoros.task_name_iv IS 'IV użyty do zaszyfrowania nazwy (Base64)';
