-- Update a task and replace its tags in a single transaction.
-- A plpgsql function body runs atomically: if any statement fails, everything rolls back.
-- security invoker: RLS still applies; user_id filter is an extra guard.

create or replace function public.update_task_with_tags(
  p_task_id bigint,
  p_category_id bigint,
  p_title_enc text,
  p_title_iv text,
  p_description_enc text,
  p_description_iv text,
  p_tag_ids bigint[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.tasks
  set category_id = p_category_id,
      title_enc = p_title_enc,
      title_iv = p_title_iv,
      description_enc = p_description_enc,
      description_iv = p_description_iv
  where id = p_task_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Task not found';
  end if;

  delete from public.task_tags where task_id = p_task_id;

  if coalesce(array_length(p_tag_ids, 1), 0) > 0 then
    insert into public.task_tags (task_id, tag_id)
    select p_task_id, t from unnest(p_tag_ids) as t
    on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.update_task_with_tags(bigint, bigint, text, text, text, text, bigint[]) from public;
grant execute on function public.update_task_with_tags(bigint, bigint, text, text, text, text, bigint[]) to authenticated;
