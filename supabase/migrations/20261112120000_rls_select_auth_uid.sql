-- RLS initplan optimisation: wrap auth.uid() in (select ...) so Postgres evaluates it once per
-- query instead of once per row. Policy semantics are unchanged.

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

drop policy if exists "Users can select own categories" on public.categories;
create policy "Users can select own categories"
  on public.categories for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own categories" on public.categories;
create policy "Users can insert own categories"
  on public.categories for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own categories" on public.categories;
create policy "Users can update own categories"
  on public.categories for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own categories" on public.categories;
create policy "Users can delete own categories"
  on public.categories for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own tags" on public.tags;
create policy "Users can select own tags"
  on public.tags for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own tags" on public.tags;
create policy "Users can insert own tags"
  on public.tags for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own tags" on public.tags;
create policy "Users can update own tags"
  on public.tags for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own tags" on public.tags;
create policy "Users can delete own tags"
  on public.tags for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own tasks" on public.tasks;
create policy "Users can select own tasks"
  on public.tasks for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own tasks" on public.tasks;
create policy "Users can insert own tasks"
  on public.tasks for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks"
  on public.tasks for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks"
  on public.tasks for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own pomodoros" on public.pomodoros;
create policy "Users can select own pomodoros"
  on public.pomodoros for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own pomodoros" on public.pomodoros;
create policy "Users can insert own pomodoros"
  on public.pomodoros for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own pomodoros" on public.pomodoros;
create policy "Users can update own pomodoros"
  on public.pomodoros for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own pomodoros" on public.pomodoros;
create policy "Users can delete own pomodoros"
  on public.pomodoros for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own task_tags" on public.task_tags;
create policy "Users can select own task_tags"
  on public.task_tags for select
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and t.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert own task_tags" on public.task_tags;
create policy "Users can insert own task_tags"
  on public.task_tags for insert
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and t.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.tags g
      where g.id = tag_id and g.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete own task_tags" on public.task_tags;
create policy "Users can delete own task_tags"
  on public.task_tags for delete
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and t.user_id = (select auth.uid())
    )
  );
