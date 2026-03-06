-- Add profile_share_token to get_directory_page so directory can link to /p/:token (fix 404 when clicking member).
-- RLS grants already apply to this function name/signature.

drop function if exists public.get_directory_page(uuid, text, text, text, text, text[], text, text, int, int);

create or replace function public.get_directory_page(
  p_viewer_id uuid,
  p_search text default null,
  p_primary_industry text default null,
  p_secondary_industry text default null,
  p_location text default null,
  p_skills text[] default null,
  p_connection_status text default null,
  p_sort text default 'recently_active',
  p_offset int default 0,
  p_limit int default 25
)
returns table (
  id uuid,
  handle text,
  display_name text,
  avatar text,
  tagline text,
  pronouns text,
  industry text,
  secondary_industry text,
  location text,
  skills text[],
  bio_snippet text,
  connection_state text,
  use_weirdling_avatar boolean,
  profile_share_token text
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  with params as (
    select
      p_viewer_id as viewer_id,
      nullif(lower(trim(p_search)), '') as search_q,
      nullif(trim(p_primary_industry), '') as primary_industry_q,
      nullif(trim(p_secondary_industry), '') as secondary_industry_q,
      nullif(lower(trim(p_location)), '') as location_q,
      coalesce(
        (select array_agg(lower(trim(s))) from unnest(coalesce(p_skills, '{}')) s where trim(s) <> ''),
        '{}'
      ) as skills_q
  ),
  viewer_outgoing as (
    select fc.connected_user_id as profile_id
    from public.feed_connections fc
    join params pr on true
    where fc.user_id = pr.viewer_id
  ),
  viewer_incoming as (
    select fc.user_id as profile_id
    from public.feed_connections fc
    join params pr on true
    where fc.connected_user_id = pr.viewer_id
  ),
  any_connection as (
    select profile_id from viewer_outgoing
    union
    select profile_id from viewer_incoming
  ),
  mutual_connection as (
    select vo.profile_id
    from viewer_outgoing vo
    join viewer_incoming vi on vi.profile_id = vo.profile_id
  ),
  pending_out as (
    select cr.recipient_id as profile_id
    from public.connection_requests cr
    join params pr on true
    where cr.requester_id = pr.viewer_id
      and cr.status = 'pending'
  ),
  pending_in as (
    select cr.requester_id as profile_id
    from public.connection_requests cr
    join params pr on true
    where cr.recipient_id = pr.viewer_id
      and cr.status = 'pending'
  ),
  visible as (
    select
      p.id,
      p.handle,
      p.display_name,
      p.avatar,
      p.tagline,
      p.pronouns,
      p.industry,
      p.secondary_industry,
      p.location,
      p.nerd_creds,
      p.created_at,
      p.last_active_at,
      p.use_weirdling_avatar,
      p.profile_share_token,
      w.avatar_url as weirdling_avatar
    from public.profiles p
    join params pr on true
    left join public.weirdlings w on w.user_id = p.id and w.is_active = true
    where p.status = 'approved'
      and p.id != pr.viewer_id
      and (
        p.profile_visibility = 'members_only'
        or exists (select 1 from any_connection ac where ac.profile_id = p.id)
      )
      and (
        pr.search_q is null
        or lower(coalesce(p.display_name, '')) like '%' || pr.search_q || '%'
        or lower(coalesce(p.handle, '')) like '%' || pr.search_q || '%'
        or lower(coalesce(p.tagline, '')) like '%' || pr.search_q || '%'
        or lower(coalesce(p.industry, '')) like '%' || pr.search_q || '%'
        or lower(coalesce(p.secondary_industry, '')) like '%' || pr.search_q || '%'
        or lower(coalesce(p.niche_field, '')) like '%' || pr.search_q || '%'
        or lower(coalesce(p.location, '')) like '%' || pr.search_q || '%'
        or lower(coalesce(p.nerd_creds->>'bio', '')) like '%' || pr.search_q || '%'
        or exists (
          select 1 from jsonb_array_elements_text(coalesce(p.nerd_creds->'skills', '[]'::jsonb)) s
          where lower(s) like '%' || pr.search_q || '%'
        )
      )
      and (
        (pr.primary_industry_q is null or p.industry = pr.primary_industry_q or p.secondary_industry = pr.primary_industry_q
          or (p.industries is not null and jsonb_array_length(p.industries) > 0 and exists (
            select 1 from jsonb_array_elements(p.industries) g where (g->>'industry') = pr.primary_industry_q
          )))
        or (pr.secondary_industry_q is null or p.industry = pr.secondary_industry_q or p.secondary_industry = pr.secondary_industry_q)
      )
      and (pr.location_q is null or lower(coalesce(p.location, '')) like '%' || pr.location_q || '%')
      and (
        array_length(pr.skills_q, 1) is null
        or exists (
          select 1 from jsonb_array_elements_text(coalesce(p.nerd_creds->'skills', '[]'::jsonb)) s
          where lower(s) = any(pr.skills_q)
        )
      )
  ),
  conn_state as (
    select
      v.id,
      case
        when exists (select 1 from mutual_connection mc where mc.profile_id = v.id) then 'connected'
        when exists (select 1 from pending_out po where po.profile_id = v.id) then 'pending'
        when exists (select 1 from pending_in pi where pi.profile_id = v.id) then 'pending_received'
        else 'not_connected'
      end as state
    from visible v
  )
  select
    v.id,
    v.handle,
    v.display_name,
    coalesce(
      case when v.use_weirdling_avatar then v.weirdling_avatar else null end,
      v.avatar
    )::text as avatar,
    v.tagline,
    v.pronouns,
    v.industry,
    v.secondary_industry,
    v.location,
    (
      select coalesce(array_agg(t.val), '{}')
      from (
        select s::text as val
        from jsonb_array_elements_text(coalesce(v.nerd_creds->'skills', '[]'::jsonb)) s
        limit 3
      ) t
    ) as skills,
    left(coalesce(v.nerd_creds->>'bio', ''), 120) as bio_snippet,
    cs.state as connection_state,
    coalesce(v.use_weirdling_avatar, false) as use_weirdling_avatar,
    v.profile_share_token
  from visible v
  join conn_state cs on cs.id = v.id
  where (p_connection_status is null or cs.state = p_connection_status)
  order by
    case p_sort
      when 'alphabetical' then 1
      else 2
    end,
    case p_sort
      when 'alphabetical' then coalesce(v.display_name, v.handle)
      else null
    end asc nulls last,
    case p_sort
      when 'alphabetical' then v.id
      else null
    end asc,
    case p_sort
      when 'newest' then v.created_at
      when 'recently_active' then coalesce(v.last_active_at, v.created_at)
      else null
    end desc nulls last,
    v.id desc
  offset greatest(0, p_offset)
  limit least(p_limit, 51);
$$;

comment on function public.get_directory_page is
  'Directory listing: searchable, filterable, connection-aware, privacy-respecting. Returns profile_share_token for /p/:token links.';
