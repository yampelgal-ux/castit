-- ════════════════════════════════════════════════════════════════
-- CastIt — "Real app" migration (run AFTER supabase-schema.sql)
-- Supabase Dashboard → SQL Editor → New query → paste everything → Run.
-- Safe to run more than once.
--
-- What it adds:
--   1. user_kv         — every user's app data (projects, roles, pipeline,
--                        notifications, notes, calendar…) synced across devices
--   2. shared_records  — data that crosses accounts: audition invites between a
--                        casting pro and a talent, public share / approval links
--   3. RPCs            — anonymous director votes + view tracking on public links
--   4. profiles.talent_card / role fixes — real talents show up in Pro Search
--   5. Storage bucket "media" — self-tapes, sides files, avatars
--   6. Realtime on the new tables
-- ════════════════════════════════════════════════════════════════

-- ── 1. Per-user key/value sync ────────────────────────────────────
create table if not exists public.user_kv (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      text,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_kv enable row level security;

drop policy if exists "user_kv owner select" on public.user_kv;
drop policy if exists "user_kv owner insert" on public.user_kv;
drop policy if exists "user_kv owner update" on public.user_kv;
drop policy if exists "user_kv owner delete" on public.user_kv;
create policy "user_kv owner select" on public.user_kv for select using (auth.uid() = user_id);
create policy "user_kv owner insert" on public.user_kv for insert with check (auth.uid() = user_id);
create policy "user_kv owner update" on public.user_kv for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_kv owner delete" on public.user_kv for delete using (auth.uid() = user_id);

-- ── 2. Cross-account records ──────────────────────────────────────
-- kind: 'submission' | 'share_packet' | 'approval_session'
create table if not exists public.shared_records (
  id         text primary key,
  kind       text not null,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  member_ids uuid[] not null default '{}',
  slug       text unique,
  is_public  boolean not null default false,
  data       jsonb not null,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shared_records_members_idx on public.shared_records using gin (member_ids);
create index if not exists shared_records_owner_idx   on public.shared_records (owner_id);

alter table public.shared_records enable row level security;

drop policy if exists "shared select" on public.shared_records;
drop policy if exists "shared insert" on public.shared_records;
drop policy if exists "shared update" on public.shared_records;
drop policy if exists "shared delete" on public.shared_records;
create policy "shared select" on public.shared_records for select
  using (auth.uid() = owner_id or auth.uid() = any(member_ids));
create policy "shared insert" on public.shared_records for insert
  with check (auth.uid() = owner_id);
create policy "shared update" on public.shared_records for update
  using (auth.uid() = owner_id or auth.uid() = any(member_ids))
  with check (auth.uid() = owner_id or auth.uid() = any(member_ids));
create policy "shared delete" on public.shared_records for delete
  using (auth.uid() = owner_id);

-- Members may not re-assign ownership / membership of a record they don't own.
create or replace function public.shared_records_guard()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'UPDATE' and auth.uid() is distinct from old.owner_id then
    new.owner_id   := old.owner_id;
    new.member_ids := old.member_ids;
    new.is_public  := old.is_public;
    new.slug       := old.slug;
    new.kind       := old.kind;
  end if;
  return new;
end $$;

drop trigger if exists shared_records_guard on public.shared_records;
create trigger shared_records_guard before insert or update on public.shared_records
  for each row execute function public.shared_records_guard();

-- ── 3. Anonymous actions on public links (no account needed) ──────
-- Public links are fetched one-at-a-time by slug (never listable).
create or replace function public.get_public_link(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select data from shared_records where slug = p_slug and is_public limit 1;
$$;

create or replace function public.log_link_view(p_slug text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update shared_records
     set data = jsonb_set(data, '{views}',
                coalesce(data->'views', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('at', now()))),
         updated_at = now()
   where slug = p_slug and is_public;
end $$;

create or replace function public.cast_approval_vote(
  p_slug text, p_submission_id text, p_vote text, p_voter text default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare rec shared_records;
begin
  if p_vote not in ('yes','maybe','no') then raise exception 'bad vote'; end if;
  select * into rec from shared_records where slug = p_slug and kind = 'approval_session' and is_public;
  if not found then return; end if;
  update shared_records set
    data = jsonb_set(rec.data, '{talents}', (
      select coalesce(jsonb_agg(
        case when t->>'submissionId' = p_submission_id
          then t || jsonb_build_object('vote', p_vote, 'voterName', left(coalesce(p_voter,''), 80),
                                       'voteNote', left(coalesce(p_note,''), 1000), 'votedAt', now())
          else t end), '[]'::jsonb)
      from jsonb_array_elements(rec.data->'talents') t)),
    updated_at = now()
  where id = rec.id;
end $$;

grant execute on function public.get_public_link(text) to anon, authenticated;
grant execute on function public.log_link_view(text) to anon, authenticated;
grant execute on function public.cast_approval_vote(text, text, text, text, text) to anon, authenticated;

-- ── 4. Profiles: discoverable talent cards ────────────────────────
alter table public.profiles add column if not exists talent_card jsonb;
alter table public.profiles add column if not exists updated_at timestamptz default now();
create unique index if not exists typecasts_profile_unique on public.typecasts (profile_id);

drop policy if exists "Users can update own typecast" on public.typecasts;
drop policy if exists "Typecasts are viewable by everyone" on public.typecasts;
drop policy if exists "Users can insert own typecast" on public.typecasts;
alter table public.typecasts enable row level security;
create policy "Typecasts are viewable by everyone" on public.typecasts for select using (true);
create policy "Users can insert own typecast" on public.typecasts for insert with check (auth.uid() = profile_id);
create policy "Users can update own typecast" on public.typecasts for update using (auth.uid() = profile_id);

-- Notifications: allow a user to create notifications for themselves
drop policy if exists "Users can insert own notifications" on public.notifications;
create policy "Users can insert own notifications" on public.notifications for insert with check (auth.uid() = profile_id);

-- ── 5. Storage bucket for tapes / sides / avatars ─────────────────
-- Public-read with unguessable object keys (like unlisted links), so a director
-- opening an approval link can play the tape without an account.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media authenticated upload" on storage.objects;
drop policy if exists "media owner update" on storage.objects;
drop policy if exists "media owner delete" on storage.objects;
create policy "media authenticated upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media');
create policy "media owner update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and owner = auth.uid());
create policy "media owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and owner = auth.uid());

-- ── 6. Realtime ───────────────────────────────────────────────────
do $$ begin
  begin alter publication supabase_realtime add table public.user_kv; exception when others then null; end;
  begin alter publication supabase_realtime add table public.shared_records; exception when others then null; end;
  begin alter publication supabase_realtime add table public.messages; exception when others then null; end;
end $$;
