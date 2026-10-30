-- ════════════════════════════════════════════════════════════════
-- CastIt — Phone notifications (web push)
-- Each phone that turned notifications on stores its push address here.
-- The app's server sends a notification only between people who already
-- talk or share an audition, and never across a block.
-- Run AFTER 006_invite_links.sql. Safe to run more than once.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users on delete cascade,
  p256dh text not null,
  auth text not null,
  lang text not null default 'he',
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

drop policy if exists "push own select" on public.push_subscriptions;
drop policy if exists "push own insert" on public.push_subscriptions;
drop policy if exists "push own update" on public.push_subscriptions;
drop policy if exists "push own delete" on public.push_subscriptions;
create policy "push own select" on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "push own insert" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "push own update" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push own delete" on public.push_subscriptions for delete using (auth.uid() = user_id);

-- The phones of p_to, if the signed-in user may notify them.
create or replace function public.push_targets(p_to uuid)
returns table (endpoint text, p256dh text, auth text, lang text, sender_name text)
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null or p_to is null or p_to = me then return; end if;
  if public.is_blocked_between(me, p_to) then return; end if;
  if exists (select 1 from public.profiles where id = me and banned) then return; end if;
  if not (
    exists (select 1 from public.conversations c
             where (c.participant_a = me and c.participant_b = p_to) or (c.participant_a = p_to and c.participant_b = me))
    or exists (select 1 from public.shared_records r
                where r.kind = 'submission'
                  and ((r.owner_id = me and p_to = any(r.member_ids)) or (r.owner_id = p_to and me = any(r.member_ids))))
  ) then return; end if;

  return query
    select s.endpoint, s.p256dh, s.auth, s.lang, coalesce(nullif(p.name, ''), p.username, '')::text
      from public.push_subscriptions s
      join public.profiles p on p.id = me
     where s.user_id = p_to;
end $$;
revoke all on function public.push_targets(uuid) from public, anon;
grant execute on function public.push_targets(uuid) to authenticated;

-- A phone that uninstalled or turned notifications off: forget its address.
create or replace function public.drop_push_endpoint(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;
revoke all on function public.drop_push_endpoint(text) from public, anon;
grant execute on function public.drop_push_endpoint(text) to authenticated;

-- ── In-app feedback ─────────────────────────────────────────────
-- "Send feedback" lands in the reports table as kind 'feedback', so the
-- admin screen shows it next to reports.
alter table public.reports drop constraint if exists reports_target_kind_check;
alter table public.reports add constraint reports_target_kind_check
  check (target_kind in ('user', 'reel', 'comment', 'message', 'feedback'));

-- ── New open audition → notify matching actors ──────────────────
-- Called once by the casting director's phone when a role is listed on the
-- open auditions board. Returns the phones of actors whose published card
-- matches the call's target (data.target: genders, ageMin, ageMax), then marks
-- the call as notified so it can't be used to spam. The "already sent" mark
-- lives in its own table that nobody can write to directly.
create table if not exists public.open_call_notified (
  code text primary key,
  owner_id uuid not null,
  at timestamptz not null default now()
);
alter table public.open_call_notified enable row level security;
revoke all on public.open_call_notified from anon, authenticated;

create or replace function public.open_call_push_targets(p_code text)
returns table (endpoint text, p256dh text, auth text, lang text, sender_name text)
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  inv public.shared_records;
  genders text[];
  amin int;
  amax int;
begin
  if me is null or not public.is_approved_pro() then return; end if;
  select * into inv from public.shared_records
   where slug = p_code and kind = 'open_invite' and owner_id = me;
  if inv.id is null or not coalesce((inv.data->>'listed')::boolean, false)
     or coalesce((inv.data->>'closed')::boolean, false) then
    return;
  end if;
  insert into public.open_call_notified (code, owner_id) values (p_code, me) on conflict do nothing;
  if not found then return; end if;
  -- At most 5 new calls a day per casting director reach phones.
  if (select count(*) from public.open_call_notified where owner_id = me and at > now() - interval '1 day') > 5 then return; end if;
  update public.shared_records set data = data || jsonb_build_object('notifiedAt', now()) where id = inv.id;

  select array(select jsonb_array_elements_text(coalesce(inv.data->'target'->'genders', '[]'::jsonb))) into genders;
  amin := nullif(inv.data->'target'->>'ageMin', '')::int;
  amax := nullif(inv.data->'target'->>'ageMax', '')::int;

  return query
    select s.endpoint, s.p256dh, s.auth, s.lang, coalesce(nullif(me_p.name, ''), me_p.username, '')::text
      from public.push_subscriptions s
      join public.profiles t on t.id = s.user_id
      join public.profiles me_p on me_p.id = me
     where t.talent_card is not null and not coalesce(t.banned, false) and t.id <> me
       and not public.is_blocked_between(me, t.id)
       and (cardinality(genders) = 0 or t.talent_card->'typecast'->>'gender' = any(genders))
       and (amin is null or coalesce((t.talent_card->'typecast'->'ageRange'->>1)::int, 200) >= amin)
       and (amax is null or coalesce((t.talent_card->'typecast'->'ageRange'->>0)::int, 0) <= amax)
     limit 3000;
end $$;
revoke all on function public.open_call_push_targets(text) from public, anon;
grant execute on function public.open_call_push_targets(text) to authenticated;
