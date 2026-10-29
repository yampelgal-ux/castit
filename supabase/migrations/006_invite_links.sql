-- ════════════════════════════════════════════════════════════════
-- CastIt — Invite links for actors who aren't on CastIt yet
-- A casting director creates a link for a role and sends it on WhatsApp.
-- The actor opens it, signs up, and lands straight in that audition.
-- Run AFTER 005_trust.sql. Safe to run more than once.
-- ════════════════════════════════════════════════════════════════

-- Invites and invite links only from approved casting directors.
drop policy if exists "shared insert" on public.shared_records;
create policy "shared insert" on public.shared_records for insert
  with check (auth.uid() = owner_id and (kind not in ('submission', 'open_invite') or public.is_approved_pro()));

-- The signed-in actor joins the audition behind an invite link: creates the
-- same submission a direct invite would, owned by the casting director.
create or replace function public.claim_open_invite(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  inv public.shared_records;
  prof public.profiles;
  existing text;
  sub_id text;
  sub jsonb;
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into inv from public.shared_records where slug = p_code and kind = 'open_invite' and is_public;
  if inv.id is null then return null; end if;
  if inv.owner_id = me then return null; end if;
  if not exists (select 1 from public.profiles where id = inv.owner_id and pro_status = 'approved' and not banned) then
    return null;
  end if;
  if coalesce((inv.data->>'closed')::boolean, false) then return null; end if;

  select r.id into existing from public.shared_records r
   where r.kind = 'submission' and r.owner_id = inv.owner_id and me = any(r.member_ids)
     and r.data->'submission'->>'roleId' = inv.data->'role'->>'id'
   limit 1;
  if existing is not null then return existing; end if;

  select * into prof from public.profiles where id = me;
  sub_id := 'sub_' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
  sub := jsonb_build_object(
    'id', sub_id,
    'roleId', inv.data->'role'->>'id',
    'talentId', me,
    'talentName', coalesce(prof.name, prof.username, ''),
    'talentPhoto', coalesce(prof.photo_url, ''),
    'stage', 'invited',
    'tapes', '[]'::jsonb,
    'inviteMessage', inv.data->>'message',
    'proMessage', inv.data->>'message',
    'createdAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  if inv.data ? 'deadline' and coalesce(inv.data->>'deadline', '') <> '' then
    sub := sub || jsonb_build_object('inviteDeadline', inv.data->>'deadline');
  end if;

  insert into public.shared_records (id, kind, owner_id, member_ids, data)
  values ('sub:' || sub_id, 'submission', inv.owner_id, array[me],
          jsonb_build_object('submission', sub, 'role', inv.data->'role', 'project', inv.data->'project',
                             'viaInvite', inv.data->>'code'));

  update public.shared_records
     set data = jsonb_set(data, '{joined}', to_jsonb(coalesce((data->>'joined')::int, 0) + 1))
   where id = inv.id;
  return 'sub:' || sub_id;
end $$;
revoke all on function public.claim_open_invite(text) from public, anon;
grant execute on function public.claim_open_invite(text) to authenticated;
