-- ════════════════════════════════════════════════════════════════
-- CastIt — Safety: block, report, delete account
-- Supabase Dashboard → SQL Editor → New query → paste everything → Run.
-- Safe to run more than once.
--
--   1. blocks   — a user hides another user, both ways (feed, search,
--                 messages, comments)
--   2. reports  — reports on users, videos, comments and messages; read them
--                 in Table Editor → reports
--   3. delete_my_account() — removes the caller's account and everything
--                 tied to it
-- ════════════════════════════════════════════════════════════════

-- ── 1. Blocks ─────────────────────────────────────────────────────
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;

drop policy if exists "blocks own read"   on public.blocks;
drop policy if exists "blocks own add"    on public.blocks;
drop policy if exists "blocks own remove" on public.blocks;
create policy "blocks own read"   on public.blocks for select to authenticated using (auth.uid() = blocker_id);
create policy "blocks own add"    on public.blocks for insert to authenticated with check (auth.uid() = blocker_id);
create policy "blocks own remove" on public.blocks for delete to authenticated using (auth.uid() = blocker_id);

-- Everyone the caller should not see: people they blocked and people who
-- blocked them (without revealing which is which).
create or replace function public.my_hidden_users()
returns table (user_id uuid, blocked_by_me boolean)
language sql stable security definer set search_path = public as $$
  select blocked_id, true  from public.blocks where blocker_id = auth.uid()
  union
  select blocker_id, false from public.blocks where blocked_id = auth.uid()
    and blocker_id not in (select blocked_id from public.blocks where blocker_id = auth.uid());
$$;
grant execute on function public.my_hidden_users() to authenticated;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

-- No messages between blocked users.
drop policy if exists "Users can send messages" on public.messages;
create policy "Users can send messages" on public.messages for insert
  with check (
    auth.uid() = sender_id
    and not exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and public.is_blocked_between(c.participant_a, c.participant_b)
    )
  );

-- No comments on the videos of someone who blocked you (or whom you blocked).
drop policy if exists "reel comments add" on public.reel_comments;
create policy "reel comments add" on public.reel_comments for insert to authenticated
  with check (auth.uid() = user_id and not public.is_blocked_between(user_id, owner_id));

-- ── 2. Reports ────────────────────────────────────────────────────
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null default auth.uid(),
  target_user uuid,
  target_kind text not null check (target_kind in ('user', 'reel', 'comment', 'message')),
  target_id   text,
  reason      text not null,
  details     text,
  status      text not null default 'open',
  created_at  timestamptz not null default now()
);
alter table public.reports enable row level security;

drop policy if exists "reports add" on public.reports;
create policy "reports add" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
-- No select policy on purpose: only the project owner reads reports, in the dashboard.

-- ── 3. Delete my account ─────────────────────────────────────────
-- Paths of the caller's files in the media bucket, so the app can remove
-- them through the Storage API before the account goes.
create or replace function public.my_media_paths()
returns setof text
language sql stable security definer set search_path = public, storage as $$
  select name from storage.objects where bucket_id = 'media' and owner = auth.uid();
$$;
grant execute on function public.my_media_paths() to authenticated;

create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  -- Old tables reference profiles without cascade; clear them first.
  delete from public.messages where sender_id = uid
     or conversation_id in (select id from public.conversations where participant_a = uid or participant_b = uid);
  delete from public.conversations where participant_a = uid or participant_b = uid;
  delete from public.profiles where id = uid;
  -- Everything else (user_kv, shared_records, likes, comments, views, blocks)
  -- cascades from auth.users.
  delete from auth.users where id = uid;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
