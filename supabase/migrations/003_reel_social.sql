-- ════════════════════════════════════════════════════════════════
-- CastIt — Reels social layer (run AFTER 002_real_app.sql)
-- Likes, comments and view counts on talent reels, like Instagram / TikTok.
-- Supabase Dashboard → SQL Editor → New query → paste everything → Run.
-- Safe to run more than once.
-- ════════════════════════════════════════════════════════════════

-- reel_id is the reel's id inside profiles.talent_card.reels;
-- owner_id is the talent who posted it.

create table if not exists public.reel_likes (
  reel_id    text not null,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reel_id, user_id)
);

create table if not exists public.reel_comments (
  id           uuid primary key default gen_random_uuid(),
  reel_id      text not null,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  author_name  text not null default '',
  author_photo text not null default '',
  body         text not null check (char_length(body) between 1 and 1000),
  created_at   timestamptz not null default now()
);
create index if not exists reel_comments_reel_idx on public.reel_comments (reel_id, created_at);

-- One row per viewer per reel = unique views.
create table if not exists public.reel_views (
  reel_id    text not null,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  viewer_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reel_id, viewer_id)
);

alter table public.reel_likes    enable row level security;
alter table public.reel_comments enable row level security;
alter table public.reel_views    enable row level security;

drop policy if exists "reel likes read"   on public.reel_likes;
drop policy if exists "reel likes add"    on public.reel_likes;
drop policy if exists "reel likes remove" on public.reel_likes;
create policy "reel likes read"   on public.reel_likes for select using (true);
create policy "reel likes add"    on public.reel_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "reel likes remove" on public.reel_likes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "reel comments read"   on public.reel_comments;
drop policy if exists "reel comments add"    on public.reel_comments;
drop policy if exists "reel comments remove" on public.reel_comments;
create policy "reel comments read"   on public.reel_comments for select using (true);
create policy "reel comments add"    on public.reel_comments for insert to authenticated with check (auth.uid() = user_id);
-- The commenter, or the talent who owns the reel, can delete a comment.
create policy "reel comments remove" on public.reel_comments for delete to authenticated
  using (auth.uid() = user_id or auth.uid() = owner_id);

drop policy if exists "reel views add"  on public.reel_views;
drop policy if exists "reel views read" on public.reel_views;
create policy "reel views add"  on public.reel_views for insert to authenticated
  with check (auth.uid() = viewer_id and viewer_id <> owner_id);
create policy "reel views read" on public.reel_views for select to authenticated
  using (auth.uid() = owner_id or auth.uid() = viewer_id);

-- Counters for a batch of reels, plus whether the caller liked each one.
create or replace function public.reel_stats(p_ids text[])
returns table (reel_id text, likes int, comments int, views int, liked boolean)
language sql stable security definer set search_path = public as $$
  select i.id,
    (select count(*)::int from reel_likes l where l.reel_id = i.id),
    (select count(*)::int from reel_comments c where c.reel_id = i.id),
    (select count(*)::int from reel_views v where v.reel_id = i.id),
    exists (select 1 from reel_likes l where l.reel_id = i.id and l.user_id = auth.uid())
  from unnest(p_ids) as i(id);
$$;
grant execute on function public.reel_stats(text[]) to anon, authenticated;

-- Removing a reel removes its likes, comments and views (only the owner can).
create or replace function public.delete_reel_social(p_reel_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from reel_likes    where reel_id = p_reel_id and owner_id = auth.uid();
  delete from reel_comments where reel_id = p_reel_id and owner_id = auth.uid();
  delete from reel_views    where reel_id = p_reel_id and owner_id = auth.uid();
end $$;
grant execute on function public.delete_reel_social(text) to authenticated;

do $$ begin
  begin alter publication supabase_realtime add table public.reel_comments; exception when others then null; end;
end $$;
