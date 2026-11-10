-- Marks a pomodoro that was frozen by logout (as opposed to paused by hand), so the next login
-- on any device can continue it without also resuming sessions the user paused deliberately.
alter table public.pomodoros
  add column if not exists paused_on_logout boolean not null default false;
