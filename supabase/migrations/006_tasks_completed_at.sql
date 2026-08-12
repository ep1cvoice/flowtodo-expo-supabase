-- Track when a task was marked done
alter table public.tasks
  add column if not exists completed_at timestamptz;

update public.tasks
set completed_at = coalesce(completed_at, updated_at)
where done = true
  and completed_at is null;

create index if not exists tasks_user_completed_at_idx
  on public.tasks (user_id, completed_at desc nulls last)
  where done = true;
