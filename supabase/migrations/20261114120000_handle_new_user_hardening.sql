-- handle_new_user runs as security definer (it writes to public.profiles on behalf of the
-- auth trigger), so it gets a fixed, empty search_path and only schema-qualified names.
-- A signup without a username in the metadata (e.g. created from the dashboard or an OAuth
-- provider) no longer fails on the NOT NULL column: the part of the email before "@" is
-- used, and 'user' when even that is empty.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'username'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'user'
    )
  );
  return new;
end;
$$;

-- Only the auth trigger may call it.
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;
