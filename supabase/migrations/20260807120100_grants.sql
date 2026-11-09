grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.tags to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.task_tags to authenticated;

grant usage, select on all sequences in schema public to authenticated;

grant select, insert, update on table public.profiles to authenticated;
