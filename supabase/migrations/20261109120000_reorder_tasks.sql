-- Batch-update tasks.sort_order in a single round trip.
-- p_items: jsonb array of {"id": <task id>, "sort_order": <int>}.
-- security invoker: RLS still applies; user_id filter is an extra guard.

create or replace function public.reorder_tasks(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'p_items must be a JSON array';
  end if;

  update public.tasks t
  set sort_order = v.sort_order
  from jsonb_to_recordset(p_items) as v(id bigint, sort_order int)
  where t.id = v.id
    and t.user_id = auth.uid();
end;
$$;

revoke all on function public.reorder_tasks(jsonb) from public;
grant execute on function public.reorder_tasks(jsonb) to authenticated;
