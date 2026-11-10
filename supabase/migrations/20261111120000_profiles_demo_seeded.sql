-- Marks that the demo content was already seeded for this account, so it does not come back
-- after the user deletes everything themselves.
alter table public.profiles
  add column if not exists demo_seeded_at timestamptz;

-- Existing accounts that already have any content are treated as seeded; accounts that are
-- still empty keep NULL and get the demo content on their next load (as before).
update public.profiles p
set demo_seeded_at = now()
where p.demo_seeded_at is null
  and (
    exists (select 1 from public.tasks t where t.user_id = p.id)
    or exists (select 1 from public.categories c where c.user_id = p.id)
    or exists (select 1 from public.tags g where g.user_id = p.id)
  );
