-- tasks_user_id_idx (user_id) is a prefix of tasks_user_done_idx (user_id, done), and
-- pomodoros_user_id_idx (user_id) is a prefix of pomodoros_user_ended_idx (user_id, ended_at ...),
-- so the single-column indexes only add write cost.
drop index if exists public.tasks_user_id_idx;
drop index if exists public.pomodoros_user_id_idx;

-- Active task list: filter by user, order by sort_order, only open tasks.
create index if not exists tasks_user_sort_order_active_idx
  on public.tasks (user_id, sort_order)
  where done = false;
