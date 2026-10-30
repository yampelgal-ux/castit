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
