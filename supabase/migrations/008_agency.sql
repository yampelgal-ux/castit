-- ════════════════════════════════════════════════════════════════
-- CastIt — Agencies
-- An approved pro account (an agent) keeps a roster of actors who agreed to
-- be represented, and submits them to auditions (open calls / invite links)
-- in one tap. The submission is owned by the casting director, the actor sees
-- it in their inbox, and the agent can follow its status.
-- Run AFTER 007_push.sql. Safe to run more than once.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.agency_roster (
  agent_id    uuid not null references auth.users(id) on delete cascade,
  talent_id   uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  agency_name text,
  created_at  timestamptz not null default now(),
  primary key (agent_id, talent_id)
);
alter table public.agency_roster enable row level security;

drop policy if exists "roster read"   on public.agency_roster;
drop policy if exists "roster ask"    on public.agency_roster;
drop policy if exists "roster accept" on public.agency_roster;
drop policy if exists "roster leave"  on public.agency_roster;
create policy "roster read" on public.agency_roster for select to authenticated
  using (auth.uid() in (agent_id, talent_id));
-- Only approved pros can ask, always as "pending", never for themselves.
create policy "roster ask" on public.agency_roster for insert to authenticated
  with check (auth.uid() = agent_id and agent_id <> talent_id and status = 'pending'
              and public.is_approved_pro() and not public.is_blocked_between(agent_id, talent_id));
-- Only the actor can accept.
create policy "roster accept" on public.agency_roster for update to authenticated
  using (auth.uid() = talent_id) with check (auth.uid() = talent_id);
-- Either side can end it.
create policy "roster leave" on public.agency_roster for delete to authenticated
  using (auth.uid() in (agent_id, talent_id));

-- The shared_records guard keeps members from changing membership; let the
-- agency function (and only it, via a transaction-local flag) add the agent.
create or replace function public.shared_records_guard()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'UPDATE' and auth.uid() is distinct from old.owner_id then
    new.owner_id   := old.owner_id;
    if coalesce(current_setting('castit.allow_members', true), '') <> '1' then
      new.member_ids := old.member_ids;
    end if;
    new.is_public  := old.is_public;
    new.slug       := old.slug;
    new.kind       := old.kind;
  end if;
  return new;
end $$;

-- Agent's roster with names and photos.
create or replace function public.agent_roster()
returns table (talent_id uuid, status text, name text, username text, photo_url text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.talent_id, r.status, p.name, p.username, p.photo_url, r.created_at
    from public.agency_roster r join public.profiles p on p.id = r.talent_id
   where r.agent_id = auth.uid()
   order by r.status, p.name;
$$;
revoke all on function public.agent_roster() from public, anon;
grant execute on function public.agent_roster() to authenticated;

-- Actor's agencies (requests and accepted), with the agent's name.
create or replace function public.my_agencies()
returns table (agent_id uuid, status text, agency_name text, agent_name text, photo_url text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.agent_id, r.status, r.agency_name, p.name, p.photo_url, r.created_at
    from public.agency_roster r join public.profiles p on p.id = r.agent_id
   where r.talent_id = auth.uid() and not p.banned
   order by r.created_at desc;
$$;
revoke all on function public.my_agencies() from public, anon;
grant execute on function public.my_agencies() to authenticated;

-- The agent submits an actor from their roster to the audition behind an
-- invite code. Same submission the actor would create by joining themselves,
-- plus the agent as a member so they can follow it.
create or replace function public.agent_submit_to_call(p_code text, p_talent uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  inv public.shared_records;
  prof public.profiles;
  agent public.profiles;
  link public.agency_roster;
  existing text;
  sub_id text;
  sub jsonb;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not public.is_approved_pro() then raise exception 'not an approved pro'; end if;
  select * into link from public.agency_roster where agent_id = me and talent_id = p_talent and status = 'accepted';
  if link.agent_id is null then raise exception 'not on your roster'; end if;
  select * into inv from public.shared_records where slug = p_code and kind = 'open_invite' and is_public;
  if inv.id is null then return null; end if;
  if inv.owner_id in (me, p_talent) then return null; end if;
  if not exists (select 1 from public.profiles where id = inv.owner_id and pro_status = 'approved' and not banned) then return null; end if;
  if coalesce((inv.data->>'closed')::boolean, false) then return null; end if;
  if public.is_blocked_between(p_talent, inv.owner_id) then return null; end if;

  select r.id into existing from public.shared_records r
   where r.kind = 'submission' and r.owner_id = inv.owner_id and p_talent = any(r.member_ids)
     and r.data->'submission'->>'roleId' = inv.data->'role'->>'id'
   limit 1;
  if existing is not null then
    perform set_config('castit.allow_members', '1', true);
    select * into agent from public.profiles where id = me;
    update public.shared_records
       set member_ids = array(select distinct unnest(member_ids || me)),
           data = case when data->'submission' ? 'agent' then data
                       else jsonb_set(data, '{submission,agent}', jsonb_build_object('id', me, 'name', coalesce(agent.name, ''), 'agency', coalesce(link.agency_name, ''))) end
     where id = existing;
    return existing;
  end if;

  select * into prof from public.profiles where id = p_talent;
  select * into agent from public.profiles where id = me;
  sub_id := 'sub_' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
  sub := jsonb_build_object(
    'id', sub_id,
    'roleId', inv.data->'role'->>'id',
    'talentId', p_talent,
    'talentName', coalesce(prof.name, prof.username, ''),
    'talentPhoto', coalesce(prof.photo_url, ''),
    'stage', 'invited',
    'tapes', '[]'::jsonb,
    'inviteMessage', inv.data->>'message',
    'proMessage', inv.data->>'message',
    'agent', jsonb_build_object('id', me, 'name', coalesce(agent.name, ''), 'agency', coalesce(link.agency_name, '')),
    'createdAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  if coalesce(inv.data->>'deadline', '') <> '' then
    sub := sub || jsonb_build_object('inviteDeadline', inv.data->>'deadline');
  end if;

  insert into public.shared_records (id, kind, owner_id, member_ids, data)
  values ('sub:' || sub_id, 'submission', inv.owner_id, array[p_talent, me],
          jsonb_build_object('submission', sub, 'role', inv.data->'role', 'project', inv.data->'project',
                             'viaInvite', inv.data->>'code', 'viaAgent', me));
  update public.shared_records
     set data = jsonb_set(data, '{joined}', to_jsonb(coalesce((data->>'joined')::int, 0) + 1))
   where id = inv.id;
  return 'sub:' || sub_id;
end $$;
revoke all on function public.agent_submit_to_call(text, uuid) from public, anon;
grant execute on function public.agent_submit_to_call(text, uuid) to authenticated;

-- Agents and their actors may send each other phone notifications.
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
    or exists (select 1 from public.agency_roster g
                where (g.agent_id = me and g.talent_id = p_to) or (g.agent_id = p_to and g.talent_id = me))
  ) then return; end if;

  return query
    select s.endpoint, s.p256dh, s.auth, s.lang, coalesce(nullif(p.name, ''), p.username, '')::text
      from public.push_subscriptions s
      join public.profiles p on p.id = me
     where s.user_id = p_to;
end $$;
revoke all on function public.push_targets(uuid) from public, anon;
grant execute on function public.push_targets(uuid) to authenticated;
