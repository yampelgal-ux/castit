"use client";

// ════════════════════════════════════════════════════════════════
// Cross-account data (Supabase `shared_records`)
// ────────────────────────────────────────────────────────────────
//  • Audition invites: when a casting pro invites a REAL registered talent,
//    the submission (with a snapshot of the role + project) is shared with
//    that talent's account. Tapes, availability and offer answers flow back.
//  • Public links: share packets (/share/…) and director approval sessions
//    (/approve/…) are published so anyone with the link can open them on any
//    device — no account needed. Director votes come back to the pro live.
// ════════════════════════════════════════════════════════════════

import { supabase } from "@/lib/supabase";
import { isCloudConfigured, isRealUserId } from "./config";
import { onSyncedKeyChange } from "./sync";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Project, Role, Submission } from "@/lib/projects-store";
import type { SharePacket } from "@/lib/share-store";
import type { ApprovalSession } from "@/lib/approval-store";
import type { Talent } from "@/lib/mock-data";
import {
  notifyProTapeIn, notifyProAvailResponse, notifyProOfferResponse,
  notifyTalentInvited, notifyTalentStageChange, notifyProDirectorVote, notifyProJoinedViaLink,
} from "@/lib/notifications-store";
import { getCachedRealTalents } from "./talents";
import { sendPush } from "./push";

// What a phone notification cares about in a submission.
function subSig(s: Submission) {
  return [s.stage, s.tapes?.length ?? 0, s.availResponse ?? "", s.offerResponse ?? ""].join("|");
}

/** Phone notification for the other side when this device changed a shared submission. */
function pushSubmissionChange(s: Submission & SharedMarks, own: boolean, prevSig: string | undefined, role: Role | undefined) {
  const roleName = role?.name;
  if (own) {
    const to = s.talentId;
    if (prevSig === undefined) { sendPush(to, "invite", { role: roleName, href: "/inbox" }); return; }
    const [stage, , avail] = prevSig.split("|");
    if (s.stage !== stage && (s.stage === "callback" || s.stage === "offered" || s.stage === "booked")) {
      sendPush(to, s.stage, { role: roleName, href: "/inbox" });
    } else if ((s.stage === "avail_check" && stage !== "avail_check") || (s.availResponse === "pending" && avail !== "pending")) {
      sendPush(to, "avail_check", { role: roleName, href: "/inbox" });
    }
    return;
  }
  if (!prevSig || !role) return;
  const [, tapes, avail, offer] = prevSig.split("|");
  const href = `/pro/projects/${role.projectId}/role/${role.id}/submission/${s.id}`;
  if ((s.tapes?.length ?? 0) > Number(tapes)) sendPush(s._ownerId, "tape", { role: roleName, href });
  else if (s.availResponse && s.availResponse !== "pending" && s.availResponse !== avail) sendPush(s._ownerId, "avail", { role: roleName, href });
  else if (s.offerResponse && s.offerResponse !== "pending" && s.offerResponse !== offer) sendPush(s._ownerId, "offer", { role: roleName, href });
}

const KEY_P = "castit_projects_v2";
const KEY_R = "castit_roles_v3";
const KEY_S = "castit_submissions_v3";
const KEY_SHARE = "castit_share_packets_v1";
const KEY_APPR = "castit_approval_sessions_v1";
const META = "castit_shared_meta_v1";

// Fields we add to local objects to remember where shared copies came from.
export type SharedMarks = { _ownerId?: string; _remote?: boolean };

type MetaEntry = { h: string; own: boolean; kind: string; s?: string };
type MetaMap = Record<string, MetaEntry>;

let me: string | null = null;
let channel: RealtimeChannel | null = null;
let unsub: (() => void) | null = null;
let publishTimer: ReturnType<typeof setTimeout> | null = null;
let merging = false;

function read<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function meta(): MetaMap { return read<MetaMap>(META, {}); }
function saveMeta(m: MetaMap) { write(META, m); }

function strip<T extends object>(o: T): T {
  const { _ownerId, _remote, ...rest } = o as T & SharedMarks;
  void _ownerId; void _remote;
  return rest as T;
}

function changed() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("castit:remote-update"));
}

// ── Publishing (local → cloud) ───────────────────────────────────

function schedulePublish() {
  if (!me || merging) return;
  if (publishTimer) clearTimeout(publishTimer);
  publishTimer = setTimeout(() => { void publishAll(); }, 900);
}

async function publishAll() {
  if (!me) return;
  try {
    await publishSubmissions();
    await pullPublicLinks();      // merge director votes before overwriting
    await publishPublicLinks();
  } catch (e) {
    console.warn("[shared] publish failed", e);
  }
}

async function publishSubmissions() {
  if (!me) return;
  const subs = read<(Submission & SharedMarks)[]>(KEY_S, []);
  const roles = read<(Role & SharedMarks)[]>(KEY_R, []);
  const projects = read<(Project & SharedMarks)[]>(KEY_P, []);
  const rolesById = new Map(roles.map((r) => [r.id, r]));
  const projById = new Map(projects.map((p) => [p.id, p]));
  const m = meta();
  const seen = new Set<string>();

  for (const s of subs) {
    const ownerId: string = s._ownerId ?? me;
    const shareable = isRealUserId(s.talentId) && s.talentId !== ownerId;
    if (!shareable) continue;
    if (ownerId !== me && s.talentId !== me) continue;
    const id = `sub:${s.id}`;
    seen.add(id);
    const role = rolesById.get(s.roleId);
    const project = role ? projById.get(role.projectId) : undefined;
    const data = {
      submission: strip(s),
      role: role ? strip(role) : null,
      project: project ? strip(project) : null,
    };
    const h = JSON.stringify(data);
    if (m[id]?.h === h) continue;

    const own = ownerId === me;
    const { error } = own
      ? await supabase.from("shared_records").upsert(
          { id, kind: "submission", owner_id: me, member_ids: [s.talentId], data },
          { onConflict: "id" },
        )
      : await supabase.from("shared_records").update({ data }).eq("id", id);
    if (error) { console.warn("[shared] submission push", error.message); continue; }
    const sig = subSig(s);
    if (!m[id] || (m[id].s && m[id].s !== sig)) pushSubmissionChange(s, own, m[id]?.s, role);
    m[id] = { h, own, kind: "submission", s: sig };
  }

  // Pro deleted an invite / role → remove the shared copy.
  for (const [id, entry] of Object.entries(m)) {
    if (entry.kind !== "submission" || !entry.own || seen.has(id)) continue;
    const { error } = await supabase.from("shared_records").delete().eq("id", id);
    if (!error) delete m[id];
  }
  saveMeta(m);
}

async function publishPublicLinks() {
  if (!me) return;
  const m = meta();
  const real = getCachedRealTalents();
  const items: { id: string; kind: string; slug: string; data: unknown }[] = [];

  for (const p of read<SharePacket[]>(KEY_SHARE, [])) {
    const talentCards = p.talentIds
      .map((tid) => real.find((t) => t.id === tid))
      .filter(Boolean) as Talent[];
    items.push({ id: `share:${p.id}`, kind: "share_packet", slug: p.slug, data: { ...p, talentCards } });
  }
  for (const s of read<ApprovalSession[]>(KEY_APPR, [])) {
    items.push({ id: `appr:${s.id}`, kind: "approval_session", slug: s.slug, data: s });
  }

  const seen = new Set<string>();
  for (const it of items) {
    seen.add(it.id);
    const h = JSON.stringify(it.data);
    if (m[it.id]?.h === h) continue;
    const { error } = await supabase.from("shared_records").upsert(
      { id: it.id, kind: it.kind, owner_id: me, slug: it.slug, is_public: true, data: it.data },
      { onConflict: "id" },
    );
    if (error) { console.warn("[shared] link push", error.message); continue; }
    m[it.id] = { h, own: true, kind: it.kind };
  }
  for (const [id, entry] of Object.entries(m)) {
    if ((entry.kind !== "share_packet" && entry.kind !== "approval_session") || seen.has(id)) continue;
    const { error } = await supabase.from("shared_records").delete().eq("id", id);
    if (!error) delete m[id];
  }
  saveMeta(m);
}

// ── Pulling (cloud → local) ──────────────────────────────────────

type Row = { id: string; kind: string; owner_id: string; data: any; updated_at: string };

async function pullSubmissions(rows?: Row[]) {
  if (!me) return;
  if (!rows) {
    const { data, error } = await supabase
      .from("shared_records")
      .select("id,kind,owner_id,data,updated_at")
      .eq("kind", "submission");
    if (error) { console.warn("[shared] pull", error.message); return; }
    rows = (data ?? []) as Row[];
  }
  if (!rows.length) return;

  const subs = read<(Submission & SharedMarks)[]>(KEY_S, []);
  const roles = read<(Role & SharedMarks)[]>(KEY_R, []);
  const projects = read<(Project & SharedMarks)[]>(KEY_P, []);
  const m = meta();
  let dirtyS = false, dirtyR = false, dirtyP = false;
  const notes: (() => void)[] = [];

  for (const row of rows) {
    const h = JSON.stringify(row.data);
    if (m[row.id]?.h === h) continue;
    const incoming = row.data?.submission as Submission | undefined;
    if (!incoming) continue;
    const own = row.owner_id === me;
    const idx = subs.findIndex((s) => s.id === incoming.id);
    const prev = idx >= 0 ? subs[idx] : undefined;
    const role = row.data.role as Role | null;
    const project = row.data.project as Project | null;
    const roleName = role?.name ?? "";
    const projectTitle = project?.title ?? "";

    if (own) {
      if (!prev) {
        // An actor joined through this pro's invite link: a new submission we haven't seen yet.
        if (row.data.viaInvite && !m[row.id] && role && roles.some((r) => r.id === role.id)) {
          subs.unshift({ ...incoming });
          dirtyS = true;
          notes.push(() => notifyProJoinedViaLink(incoming.talentName, roleName, incoming.id, role.projectId, role.id));
        }
        m[row.id] = { h, own, kind: "submission", s: subSig(incoming) }; // otherwise the pro deleted it locally
        continue;
      }
      if (JSON.stringify(strip(prev)) !== JSON.stringify(incoming)) {
        subs[idx] = { ...incoming };
        dirtyS = true;
      }
      if ((incoming.tapes?.length ?? 0) > (prev.tapes?.length ?? 0) && role) {
        notes.push(() => notifyProTapeIn(incoming.talentName, roleName, incoming.id, role.projectId, role.id));
      }
      if (incoming.availResponse && incoming.availResponse !== prev.availResponse && incoming.availResponse !== "pending") {
        notes.push(() => notifyProAvailResponse(incoming.talentName, roleName, incoming.availResponse === "available"));
      }
      if (incoming.offerResponse && incoming.offerResponse !== prev.offerResponse && incoming.offerResponse !== "pending") {
        notes.push(() => notifyProOfferResponse(incoming.talentName, roleName, incoming.offerResponse === "accepted"));
      }
    } else {
      const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
      const next = { ...incoming, _ownerId: row.owner_id, _remote: true };
      if (idx < 0) { subs.unshift(next); dirtyS = true; }
      else if (!same(subs[idx], next)) { subs[idx] = next; dirtyS = true; }
      if (role) {
        const ri = roles.findIndex((r) => r.id === role.id);
        const rr = { ...role, _ownerId: row.owner_id, _remote: true };
        if (ri < 0) { roles.push(rr); dirtyR = true; }
        else if (!same(roles[ri], rr)) { roles[ri] = rr; dirtyR = true; }
      }
      if (project) {
        const pi = projects.findIndex((p) => p.id === project.id);
        const pp = { ...project, _ownerId: row.owner_id, _remote: true };
        if (pi < 0) { projects.push(pp); dirtyP = true; }
        else if (!same(projects[pi], pp)) { projects[pi] = pp; dirtyP = true; }
      }
      if (!prev) {
        notes.push(() => notifyTalentInvited(incoming.talentName, projectTitle, roleName, incoming.id));
      } else if (prev.stage !== incoming.stage && ["callback", "hold", "offered", "booked", "rejected"].includes(incoming.stage)) {
        notes.push(() => notifyTalentStageChange(incoming.stage as never, incoming.talentName, projectTitle, roleName, incoming.id));
      } else if (incoming.availResponse === "pending" && prev.availResponse !== "pending") {
        notes.push(() => notifyTalentStageChange("avail_check" as never, incoming.talentName, projectTitle, roleName, incoming.id));
      }
    }
    m[row.id] = { h, own, kind: "submission", s: subSig(incoming) };
  }

  merging = true;
  try {
    saveMeta(m);
    if (dirtyP) write(KEY_P, projects);
    if (dirtyR) write(KEY_R, roles);
    if (dirtyS) write(KEY_S, subs);
    notes.forEach((n) => n());
  } finally {
    merging = false;
  }
  if (dirtyS || dirtyR || dirtyP) changed();
}

async function pullPublicLinks(rows?: Row[]) {
  if (!me) return;
  if (!rows) {
    const { data, error } = await supabase
      .from("shared_records")
      .select("id,kind,owner_id,data,updated_at")
      .eq("owner_id", me)
      .in("kind", ["share_packet", "approval_session"]);
    if (error) return;
    rows = (data ?? []) as Row[];
  }
  const m = meta();
  let dirtyShare = false, dirtyAppr = false;
  const packets = read<SharePacket[]>(KEY_SHARE, []);
  const sessions = read<ApprovalSession[]>(KEY_APPR, []);
  const notes: (() => void)[] = [];

  for (const row of rows) {
    if (row.owner_id !== me) continue;
    const h = JSON.stringify(row.data);
    if (m[row.id]?.h === h) continue;
    if (row.kind === "share_packet") {
      const i = packets.findIndex((p) => p.id === row.data.id);
      if (i < 0) continue;
      const remoteViews = (row.data.views ?? []) as SharePacket["views"];
      if (remoteViews.length > packets[i].views.length) {
        packets[i] = { ...packets[i], views: remoteViews };
        dirtyShare = true;
      }
    } else if (row.kind === "approval_session") {
      const i = sessions.findIndex((s) => s.id === row.data.id);
      if (i < 0) continue;
      const local = sessions[i];
      const remote = row.data as ApprovalSession;
      const talents = local.talents.map((t) => {
        const r = remote.talents?.find((x) => x.submissionId === t.submissionId);
        if (r?.votedAt && (!t.votedAt || +new Date(r.votedAt) > +new Date(t.votedAt))) {
          notes.push(() => notifyProDirectorVote(r.voterName || "Director", t.talentName, r.vote!, local.slug));
          return { ...t, vote: r.vote, voteNote: r.voteNote, voterName: r.voterName, votedAt: r.votedAt };
        }
        return t;
      });
      const views = (remote.views?.length ?? 0) > local.views.length ? remote.views : local.views;
      const next = { ...local, talents, views };
      if (JSON.stringify(next) !== JSON.stringify(local)) { sessions[i] = next; dirtyAppr = true; }
    }
  }

  merging = true;
  try {
    if (dirtyShare) write(KEY_SHARE, packets);
    if (dirtyAppr) write(KEY_APPR, sessions);
    notes.forEach((n) => n());
  } finally {
    merging = false;
  }
  if (dirtyShare || dirtyAppr) changed();
}

// ── Lifecycle ────────────────────────────────────────────────────

export async function startShared(userId: string) {
  if (!isCloudConfigured()) return;
  me = userId;
  unsub?.();
  unsub = onSyncedKeyChange((key, _v, origin) => {
    if (origin !== "local") return;
    if ([KEY_S, KEY_R, KEY_P, KEY_SHARE, KEY_APPR].includes(key)) schedulePublish();
  });
  await pullSubmissions();
  await pullPublicLinks();
  schedulePublish();

  if (channel) void supabase.removeChannel(channel);
  channel = supabase
    .channel(`shared:${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "shared_records" }, (payload) => {
      const row = payload.new as Row | undefined;
      if (!row?.id) return;
      if (row.kind === "submission") void pullSubmissions([row]);
      else void pullPublicLinks([row]);
    })
    .subscribe();
}

export function stopShared() {
  me = null;
  unsub?.(); unsub = null;
  if (publishTimer) clearTimeout(publishTimer);
  if (channel) { void supabase.removeChannel(channel); channel = null; }
}

/** Manual refresh (e.g. pull-to-refresh / app resume). */
export async function refreshShared() {
  if (!me) return;
  await pullSubmissions();
  await pullPublicLinks();
}

// ── Public link access for anonymous viewers ─────────────────────

export async function fetchPublicLink<T>(slug: string): Promise<T | null> {
  if (!isCloudConfigured()) return null;
  const { data, error } = await supabase.rpc("get_public_link", { p_slug: slug });
  if (error || !data) return null;
  return data as T;
}

export async function logPublicView(slug: string) {
  if (!isCloudConfigured()) return;
  await supabase.rpc("log_link_view", { p_slug: slug });
}

export async function castPublicVote(slug: string, submissionId: string, vote: string, voter?: string, note?: string) {
  if (!isCloudConfigured()) return;
  await supabase.rpc("cast_approval_vote", {
    p_slug: slug, p_submission_id: submissionId, p_vote: vote, p_voter: voter ?? null, p_note: note ?? null,
  });
}
