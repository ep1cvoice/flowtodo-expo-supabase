-- ---------------------------------------------------------------------------
-- Drop plaintext content columns.
--
-- All user content now lives in the encrypted *_enc / *_iv columns and the app
-- no longer reads or writes the plaintext ones.
--
-- IRREVERSIBLE: dropped data cannot be restored. The guard below aborts the
-- whole migration (nothing is dropped) if any row still holds plaintext
-- without a complete encrypted counterpart, so no content is lost silently.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  orphaned bigint;
BEGIN
  SELECT count(*) INTO orphaned
  FROM public.tasks
  WHERE (title <> '' AND (title_enc IS NULL OR title_iv IS NULL))
     OR (description <> '' AND (description_enc IS NULL OR description_iv IS NULL));
  IF orphaned > 0 THEN
    RAISE EXCEPTION 'tasks: % row(s) still have plaintext title/description without encrypted data; aborting', orphaned;
  END IF;

  SELECT count(*) INTO orphaned
  FROM public.tags
  WHERE name <> '' AND (name_enc IS NULL OR name_iv IS NULL);
  IF orphaned > 0 THEN
    RAISE EXCEPTION 'tags: % row(s) still have plaintext name without encrypted data; aborting', orphaned;
  END IF;

  SELECT count(*) INTO orphaned
  FROM public.categories
  WHERE name <> '' AND (name_enc IS NULL OR name_iv IS NULL);
  IF orphaned > 0 THEN
    RAISE EXCEPTION 'categories: % row(s) still have plaintext name without encrypted data; aborting', orphaned;
  END IF;

  SELECT count(*) INTO orphaned
  FROM public.pomodoros
  WHERE task_name <> '' AND (task_name_enc IS NULL OR task_name_iv IS NULL);
  IF orphaned > 0 THEN
    RAISE EXCEPTION 'pomodoros: % row(s) still have plaintext task_name without encrypted data; aborting', orphaned;
  END IF;
END
$$;

ALTER TABLE public.tasks
  DROP COLUMN title,
  DROP COLUMN description;

-- Dropping "name" also drops the UNIQUE (user_id, name) constraint created in
-- 002_tasks_domain.sql. Uniqueness is enforced on name_hash instead
-- (tags_user_name_hash_unique / categories_user_name_hash_unique).
ALTER TABLE public.tags
  DROP COLUMN name;

ALTER TABLE public.categories
  DROP COLUMN name;

ALTER TABLE public.pomodoros
  DROP COLUMN task_name;
