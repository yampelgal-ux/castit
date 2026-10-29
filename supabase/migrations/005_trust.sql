-- ════════════════════════════════════════════════════════════════
-- CastIt — Trust: approved casting directors, parent consent for minors,
-- and an admin screen (/admin) to run both plus the reports from 004.
-- Run AFTER 004_safety.sql. Safe to run more than once.
--
-- Make yourself admin at the bottom of this file (replace the email).
-- ════════════════════════════════════════════════════════════════

-- ── Admins ────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security; -- no policies: only definer functions read it

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to authenticated;

-- ── Profile columns ───────────────────────────────────────────────
alter table public.profiles add column if not exists pro_status  text not null default 'none';
alter table public.profiles add column if not exists is_minor    boolean not null default false;
alter table public.profiles add column if not exists guardian_ok boolean not null default false;
alter table public.profiles add column if not exists banned      boolean not null default false;
do $$ begin
  alter table public.profiles add constraint profiles_pro_status_check
    check (pro_status in ('none', 'pending', 'approved', 'rejected'));
exception when duplicate_object then null; end $$;

-- Casting directors who signed up before this migration wait for approval too.
update public.profiles set pro_status = 'pending' where role = 'casting_pro' and pro_status = 'none';

-- Users can't approve themselves, un-declare being a minor, or show a minor's
-- card before a parent agreed. Trusted functions below set castit.trusted.
create or replace function public.profiles_trust_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('castit.trusted', true), '') <> '1' then
    if tg_op = 'INSERT' then
      new.verified := false;
      new.guardian_ok := false;
      new.banned := false;
      new.pro_status := case when new.role = 'casting_pro' then 'pending' else 'none' end;
    else
      new.verified := old.verified;
      new.guardian_ok := old.guardian_ok;
      new.banned := old.banned;
      new.is_minor := old.is_minor or new.is_minor;
      if new.role = 'casting_pro' then
        new.pro_status := case when old.role = 'casting_pro' then old.pro_status else 'pending' end;
        if old.role <> 'casting_pro' then new.verified := false; end if;
      else
        new.pro_status := 'none';
      end if;
    end if;
  end if;
  if new.banned or (new.is_minor and not new.guardian_ok) then
    new.talent_card := null;
  end if;
  return new;
end $$;
drop trigger if exists profiles_trust_guard on public.profiles;
create trigger profiles_trust_guard before insert or update on public.profiles
  for each row execute function public.profiles_trust_guard();

create or replace function public.is_approved_pro()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and role = 'casting_pro' and pro_status = 'approved' and not banned);
$$;
grant execute on function public.is_approved_pro() to authenticated;

-- Only approved casting directors (or talents) may send messages; banned users can't.
create or replace function public.may_send_messages()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and not banned and (role <> 'casting_pro' or pro_status = 'approved'));
$$;
grant execute on function public.may_send_messages() to authenticated;

drop policy if exists "Users can send messages" on public.messages;
create policy "Users can send messages" on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.may_send_messages()
    and not exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and public.is_blocked_between(c.participant_a, c.participant_b)
    )
  );

-- Audition invites (submissions) only from approved casting directors.
drop policy if exists "shared insert" on public.shared_records;
create policy "shared insert" on public.shared_records for insert
  with check (auth.uid() = owner_id and (kind <> 'submission' or public.is_approved_pro()));

-- ── Casting director applications ────────────────────────────────
create table if not exists public.pro_applications (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  company    text,
  job_title  text,
  website    text,
  phone      text,
  note       text,
  updated_at timestamptz not null default now()
);
alter table public.pro_applications enable row level security;
drop policy if exists "pro app own read"   on public.pro_applications;
drop policy if exists "pro app own add"    on public.pro_applications;
drop policy if exists "pro app own update" on public.pro_applications;
create policy "pro app own read"   on public.pro_applications for select to authenticated using (auth.uid() = user_id);
create policy "pro app own add"    on public.pro_applications for insert to authenticated with check (auth.uid() = user_id);
create policy "pro app own update" on public.pro_applications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Parent consent for minors ────────────────────────────────────
create table if not exists public.guardian_consents (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  token       uuid not null unique default gen_random_uuid(),
  birth_year  int,
  parent_name text,
  approved_at timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.guardian_consents enable row level security;
drop policy if exists "consent own read" on public.guardian_consents;
drop policy if exists "consent own add"  on public.guardian_consents;
create policy "consent own read" on public.guardian_consents for select to authenticated using (auth.uid() = user_id);
create policy "consent own add"  on public.guardian_consents for insert to authenticated
  with check (auth.uid() = user_id and parent_name is null and approved_at is null);

-- What a parent sees when opening the link (no account needed).
create or replace function public.guardian_info(p_token uuid)
returns table (name text, username text, photo_url text, approved boolean, parent_name text)
language sql stable security definer set search_path = public as $$
  select p.name, p.username, p.photo_url, p.guardian_ok, g.parent_name
  from public.guardian_consents g join public.profiles p on p.id = g.user_id
  where g.token = p_token;
$$;
grant execute on function public.guardian_info(uuid) to anon, authenticated;

create or replace function public.guardian_decide(p_token uuid, p_parent_name text, p_approve boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select user_id into uid from public.guardian_consents where token = p_token;
  if uid is null then return false; end if;
  if p_approve and length(trim(coalesce(p_parent_name, ''))) < 2 then return false; end if;
  update public.guardian_consents
     set parent_name = case when p_approve then trim(p_parent_name) else parent_name end,
         approved_at = case when p_approve then now() else approved_at end,
         revoked_at  = case when p_approve then null else now() end
   where user_id = uid;
  perform set_config('castit.trusted', '1', true);
  update public.profiles set guardian_ok = p_approve where id = uid;
  return true;
end $$;
grant execute on function public.guardian_decide(uuid, text, boolean) to anon, authenticated;

-- ── Admin screen ──────────────────────────────────────────────────
create or replace function public.admin_pros()
returns table (id uuid, name text, username text, photo_url text, email text, pro_status text, verified boolean,
               banned boolean, company text, job_title text, website text, phone text, note text, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select p.id, p.name, p.username, p.photo_url, u.email::text, p.pro_status, p.verified, p.banned,
           a.company, a.job_title, a.website, a.phone, a.note, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.pro_applications a on a.user_id = p.id
    where p.role = 'casting_pro'
    order by (p.pro_status = 'pending') desc, p.created_at desc;
end $$;
grant execute on function public.admin_pros() to authenticated;

create or replace function public.admin_set_pro_status(p_user uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  perform set_config('castit.trusted', '1', true);
  update public.profiles set pro_status = p_status, verified = (p_status = 'approved') where id = p_user;
end $$;
grant execute on function public.admin_set_pro_status(uuid, text) to authenticated;

create or replace function public.admin_set_banned(p_user uuid, p_banned boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  perform set_config('castit.trusted', '1', true);
  update public.profiles set banned = p_banned where id = p_user;
end $$;
grant execute on function public.admin_set_banned(uuid, boolean) to authenticated;

create or replace function public.admin_reports()
returns table (id uuid, created_at timestamptz, status text, target_kind text, target_id text, reason text, details text,
               reporter_id uuid, reporter_name text, target_user uuid, target_name text, target_username text, target_banned boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select r.id, r.created_at, r.status, r.target_kind, r.target_id, r.reason, r.details,
           r.reporter_id, rp.name, r.target_user, tp.name, tp.username, coalesce(tp.banned, false)
    from public.reports r
    left join public.profiles rp on rp.id = r.reporter_id
    left join public.profiles tp on tp.id = r.target_user
    order by (r.status = 'open') desc, r.created_at desc
    limit 300;
end $$;
grant execute on function public.admin_reports() to authenticated;

create or replace function public.admin_set_report_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.reports set status = p_status where id = p_id;
end $$;
grant execute on function public.admin_set_report_status(uuid, text) to authenticated;

-- ── Make yourself admin (replace the email with the one you sign in with) ──
insert into public.admins (user_id)
select id from auth.users where email = 'ADMIN_EMAIL_HERE'
on conflict do nothing;
