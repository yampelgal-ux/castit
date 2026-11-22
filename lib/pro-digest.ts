"use client";

// The casting director's day at a glance: what came in since yesterday and
// what needs doing today. Built from the pro's own projects on this device.

import { loadProjects, loadRoles, loadSubmissions } from "@/lib/projects-store";

export type DigestLine = { key: string; he: string; en: string; href: string; urgent?: boolean };

const DAY = 86400000;

export function buildProDigest(now = Date.now()): DigestLine[] {
  const projects = new Map(loadProjects().map((p) => [p.id, p]));
  const roles = loadRoles().filter((r) => projects.has(r.projectId));
  const roleById = new Map(roles.map((r) => [r.id, r]));
  const subs = loadSubmissions().filter((s) => roleById.has(s.roleId));
  const out: DigestLine[] = [];
  const subHref = (s: (typeof subs)[number]) => {
    const r = roleById.get(s.roleId)!;
    return `/pro/projects/${r.projectId}/role/${r.id}/submission/${s.id}`;
  };

  // New tapes in the last 24h.
  const fresh = subs.filter((s) => s.tapes?.some((t) => now - new Date(t.submittedAt).getTime() < DAY));
  if (fresh.length) {
    out.push({
      key: "tapes",
      he: fresh.length === 1 ? `טייפ חדש מ${fresh[0].talentName}` : `${fresh.length} טייפים חדשים מאתמול`,
      en: fresh.length === 1 ? `New tape from ${fresh[0].talentName}` : `${fresh.length} new tapes since yesterday`,
      href: fresh.length === 1 ? subHref(fresh[0]) : "/pro/triage",
    });
  }

  // Callbacks today.
  const today = new Date(now).toDateString();
  const cbs = subs
    .filter((s) => s.stage === "callback" && s.callbackScheduledAt && !s.callbackCompleted && new Date(s.callbackScheduledAt).toDateString() === today)
    .sort((a, b) => a.callbackScheduledAt!.localeCompare(b.callbackScheduledAt!));
  if (cbs.length) {
    const times = cbs.map((s) => `${new Date(s.callbackScheduledAt!).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })} ${s.talentName.split(" ")[0]}`).join(", ");
    out.push({ key: "cb", he: `קולבקים היום: ${times}`, en: `Callbacks today: ${times}`, href: "/pro/calendar", urgent: true });
  }

  // Holds that end in the next 24h.
  const holds = subs.filter((s) => s.stage === "hold" && s.holdUntil && +new Date(s.holdUntil) - now < DAY && +new Date(s.holdUntil) > now);
  if (holds.length) {
    out.push({
      key: "holds",
      he: holds.length === 1 ? `ההחזקה של ${holds[0].talentName} נגמרת היום` : `${holds.length} החזקות נגמרות היום`,
      en: holds.length === 1 ? `${holds[0].talentName}'s hold ends today` : `${holds.length} holds end today`,
      href: holds.length === 1 ? subHref(holds[0]) : "/pro/inbox", urgent: true,
    });
  }

  // Tape deadlines in the next 2 days with actors still missing.
  for (const r of roles) {
    if (!r.deadline) continue;
    const d = new Date(r.deadline), n = new Date(now);
    const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()) / DAY);
    if (days < 0 || days > 1) continue;
    const missing = subs.filter((s) => s.roleId === r.id && s.stage === "invited" && !(s.tapes?.length)).length;
    if (!missing) continue;
    out.push({
      key: `dl_${r.id}`,
      he: `${r.name}: ${missing === 1 ? "שחקן/ית אחד/ת עוד לא שלח/ה" : `${missing} עוד לא שלחו`} טייפ, הדדליין ${days === 0 ? "היום" : "מחר"}`,
      en: `${r.name}: ${missing} still missing a tape, due ${days === 0 ? "today" : "tomorrow"}`,
      href: `/pro/projects/${r.projectId}/role/${r.id}`, urgent: days === 0,
    });
  }

  // Tapes waiting for a decision.
  const waiting = subs.filter((s) => s.stage === "submitted").length;
  if (waiting) {
    out.push({ key: "decide", he: waiting === 1 ? "טייפ אחד מחכה להחלטה שלך" : `${waiting} טייפים מחכים להחלטה שלך`, en: `${waiting} tapes waiting for your decision`, href: "/pro/inbox" });
  }
  return out;
}
