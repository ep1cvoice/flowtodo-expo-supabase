-- Shared max for selected categories + tags in Active filters (5–30).

alter table public.profiles
  add column if not exists max_filter_selections int not null default 10;

alter table public.profiles
  drop constraint if exists profiles_max_filter_selections_range;

alter table public.profiles
  add constraint profiles_max_filter_selections_range
  check (max_filter_selections between 5 and 30);
