-- Seeds demo categories, tags and tasks for the calling user in a single transaction.
-- All content arrives already encrypted by the client; the server only wires the ids together.
--   p_categories: [{key, name_enc, name_iv, name_hash, color, icon}]
--   p_tags:       [{key, name_enc, name_iv, name_hash, color}]
--   p_tasks:      [{title_enc, title_iv, description_enc, description_iv,
--                   category_key, tag_keys: [text], scheduled, sort_order}]
-- Returns true when the data was seeded, false when the account was already seeded.
-- The profile flag is claimed first, so concurrent calls cannot seed twice, and a failure
-- anywhere rolls back the flag together with the inserted rows.
-- security invoker: RLS still applies; user_id is always auth.uid().

create or replace function public.seed_demo_data(
  p_categories jsonb,
  p_tags jsonb,
  p_tasks jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_category_ids jsonb := '{}'::jsonb;
  v_tag_ids jsonb := '{}'::jsonb;
  v_item jsonb;
  v_id bigint;
  v_tag_key text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if jsonb_typeof(p_categories) is distinct from 'array'
     or jsonb_typeof(p_tags) is distinct from 'array'
     or jsonb_typeof(p_tasks) is distinct from 'array' then
    raise exception 'Seed parameters must be JSON arrays';
  end if;

  update public.profiles
  set demo_seeded_at = now()
  where id = v_uid
    and demo_seeded_at is null;

  if not found then
    return false;
  end if;

  for v_item in select value from jsonb_array_elements(p_categories) with ordinality order by ordinality loop
    insert into public.categories (user_id, name_enc, name_iv, name_hash, color, icon)
    values (
      v_uid,
      v_item->>'name_enc',
      v_item->>'name_iv',
      v_item->>'name_hash',
      v_item->>'color',
      v_item->>'icon'
    )
    returning id into v_id;
    v_category_ids := v_category_ids || jsonb_build_object(v_item->>'key', v_id);
  end loop;

  for v_item in select value from jsonb_array_elements(p_tags) with ordinality order by ordinality loop
    insert into public.tags (user_id, name_enc, name_iv, name_hash, color)
    values (
      v_uid,
      v_item->>'name_enc',
      v_item->>'name_iv',
      v_item->>'name_hash',
      v_item->>'color'
    )
    returning id into v_id;
    v_tag_ids := v_tag_ids || jsonb_build_object(v_item->>'key', v_id);
  end loop;

  for v_item in select value from jsonb_array_elements(p_tasks) with ordinality order by ordinality loop
    insert into public.tasks (
      user_id, title_enc, title_iv, description_enc, description_iv,
      category_id, scheduled, sort_order, done
    )
    values (
      v_uid,
      v_item->>'title_enc',
      v_item->>'title_iv',
      v_item->>'description_enc',
      v_item->>'description_iv',
      (v_category_ids->>(v_item->>'category_key'))::bigint,
      (v_item->>'scheduled')::timestamptz,
      coalesce((v_item->>'sort_order')::int, 0),
      false
    )
    returning id into v_id;

    for v_tag_key in
      select jsonb_array_elements_text(coalesce(v_item->'tag_keys', '[]'::jsonb))
    loop
      if v_tag_ids ? v_tag_key then
        insert into public.task_tags (task_id, tag_id)
        values (v_id, (v_tag_ids->>v_tag_key)::bigint)
        on conflict do nothing;
      end if;
    end loop;
  end loop;

  return true;
end;
$$;

revoke all on function public.seed_demo_data(jsonb, jsonb, jsonb) from public;
grant execute on function public.seed_demo_data(jsonb, jsonb, jsonb) to authenticated;
