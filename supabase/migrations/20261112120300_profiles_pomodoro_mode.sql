-- Pomodoro display mode: count down from the set time, or count up from 0.

alter table public.profiles
  add column if not exists pomodoro_mode text not null default 'countdown';

alter table public.profiles
  drop constraint if exists profiles_pomodoro_mode_values;

alter table public.profiles
  add constraint profiles_pomodoro_mode_values
  check (pomodoro_mode in ('countdown', 'countup'));
