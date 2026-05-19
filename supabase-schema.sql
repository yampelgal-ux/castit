-- ════════════════════════════════════════════════════════════════
-- CastIt — Supabase Database Schema
-- הרץ את כל הקוד הזה ב-Supabase SQL Editor (New Query → Paste → Run)
-- ════════════════════════════════════════════════════════════════

-- Profiles (משתמשים)
create table profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  name text,
  bio text,
  photo_url text,
  cover_url text,
  role text default 'talent',
  verified boolean default false,
  followers int default 0,
  likes int default 0,
  created_at timestamptz default now()
);

-- Typecast (תכונות הטאלנט)
create table typecasts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  height int,
  weight int,
  age_range text,
  gender text,
  ethnicity text,
  skin_tone text,
  eye_color text,
  hair_color text,
  hair_length text,
  languages text[],
  skills text[],
  genres text[]
);

-- Reels (וידאו פוסטים)
create table reels (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  video_url text not null,
  poster_url text,
  caption text,
  likes int default 0,
  comments int default 0,
  shares int default 0,
  created_at timestamptz default now()
);

-- Likes (לייקים על reels)
create table likes (
  profile_id uuid references profiles(id) on delete cascade,
  reel_id uuid references reels(id) on delete cascade,
  primary key (profile_id, reel_id)
);

-- Castings (הזדמנויות קסטינג)
create table castings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  studio text,
  type text,
  location text,
  paid boolean default true,
  deadline date,
  description text,
  requirements text,
  created_at timestamptz default now()
);

-- Applications (הגשות לקסטינג)
create table applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  casting_id uuid references castings(id) on delete cascade,
  message text,
  status text default 'pending',
  submitted_at timestamptz default now(),
  unique (profile_id, casting_id)
);

-- Conversations (שיחות DM)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid references profiles(id),
  participant_b uuid references profiles(id),
  last_message text,
  last_at timestamptz default now(),
  unique (participant_a, participant_b)
);

-- Messages (הודעות DM)
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id),
  text text not null,
  sent_at timestamptz default now()
);

-- Notifications (התראות)
create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  type text,
  title text,
  body text,
  read boolean default false,
  created_at timestamptz default now()
);

-- ════════════════════════════════════════════════════════════════
-- Row Level Security (RLS) — אבטחה
-- ════════════════════════════════════════════════════════════════

alter table profiles enable row level security;
alter table reels enable row level security;
alter table castings enable row level security;
alter table applications enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;

-- Profiles
create policy "Profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Reels
create policy "Reels are viewable by everyone" on reels for select using (true);
create policy "Users can insert own reels" on reels for insert with check (auth.uid() = profile_id);

-- Castings
create policy "Castings are viewable by everyone" on castings for select using (true);

-- Applications
create policy "Users see own applications" on applications for select using (auth.uid() = profile_id);
create policy "Users can apply" on applications for insert with check (auth.uid() = profile_id);

-- Conversations
create policy "Users see own conversations" on conversations for select
  using (auth.uid() = participant_a or auth.uid() = participant_b);
create policy "Users can create conversations" on conversations for insert
  with check (auth.uid() = participant_a or auth.uid() = participant_b);

-- Messages
create policy "Users see messages in their conversations" on messages for select
  using (exists (select 1 from conversations c where c.id = conversation_id
    and (c.participant_a = auth.uid() or c.participant_b = auth.uid())));
create policy "Users can send messages" on messages for insert
  with check (auth.uid() = sender_id);

-- Notifications
create policy "Users see own notifications" on notifications for select using (auth.uid() = profile_id);
create policy "Users can update own notifications" on notifications for update using (auth.uid() = profile_id);
