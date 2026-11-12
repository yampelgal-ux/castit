"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  getAuditionsForTalent, loadSubmissions,
  type Submission, type Role, type Project,
} from "@/lib/projects-store";
import { isRealUserId } from "@/lib/cloud/config";

// The talent's agenda: everything with a date that matters to an actor.
// Audition events are derived live from submissions (deadlines, callbacks,
// holds); personal events and reminders are stored under a castit_* key so
// the cloud sync carries them to every device. Aria reads and writes here.

export type AgendaKind = "self_tape" | "audition" | "callback" | "shoot" | "hold" | "personal" | "reminder";

export type AgendaEvent = {
  id: string;
  title: string;
  start: string;          // ISO date-time (or YYYY-MM-DD for all-day)
  end?: string;
  allDay?: boolean;
  kind: AgendaKind;
  location?: string;
  note?: string;
  href?: string;          // deep link into the app
  source: "audition" | "user" | "aria";
};

/** Something the talent needs to do that has no fixed time. */
export type AgendaAction = { id: string; title: string; detail: string; href: string };

export type AuditionItem = { submission: Submission; role: Role; project: Project };

/** Same resolution as the audition inbox: a real account sees only its own;
 *  the demo device sees its talent's auditions, or every submission on it. */
export function getMyAuditions(userId: string | null): AuditionItem[] {
  if (isRealUserId(userId)) return getAuditionsForTalent(userId!) as AuditionItem[];
  const mine = getAuditionsForTalent("me") as AuditionItem[];
  if (mine.length > 0) return mine;
  return loadSubmissions()
    .map((s) => (getAuditionsForTalent(s.talentId) as AuditionItem[]).find((x) => x.submission.id === s.id))
    .filter(Boolean) as AuditionItem[];
}

function auditionEvents(items: AuditionItem[], he: boolean): AgendaEvent[] {
  const out: AgendaEvent[] = [];
  for (const { submission: s, role, project } of items) {
    const label = `${role.name} · ${project.title}`;
    const due = s.inviteDeadline || role.deadline;
    if (s.stage === "invited" && due) {
      out.push({
        id: `dl_${s.id}`, title: `${he ? "דדליין לטייפ" : "Self-tape due"}: ${label}`, start: due, allDay: due.length <= 10,
        kind: "self_tape", href: `/inbox/${s.id}/record`, source: "audition",
      });
    }
    if (s.stage === "callback" && s.callbackType === "in_person" && s.callbackScheduledAt && !s.callbackCompleted) {
      out.push({
        id: `cb_${s.id}`, title: `${he ? "קולבק" : "Callback"}: ${label}`, start: s.callbackScheduledAt,
        kind: "callback", location: s.callbackLocation, href: `/inbox`, source: "audition",
      });
    }
    if (s.stage === "hold" && s.holdUntil) {
      out.push({
        id: `hold_${s.id}`, title: `${he ? "בהמתנה (Hold) עד" : "On hold until"}: ${label}`, start: s.holdUntil,
        kind: "hold", href: `/inbox`, source: "audition",
      });
    }
  }
  return out;
}

function auditionActions(items: AuditionItem[], he: boolean): AgendaAction[] {
  const out: AgendaAction[] = [];
  for (const { submission: s, role, project } of items) {
    const label = `${role.name} · ${project.title}`;
    if (s.stage === "invited" && !(s.inviteDeadline || role.deadline)) {
      out.push({ id: `tape_${s.id}`, title: he ? "לשלוח טייפ" : "Send a self-tape", detail: label, href: `/inbox/${s.id}/record` });
    }
    if (s.availResponse === "pending") {
      out.push({ id: `av_${s.id}`, title: he ? "לאשר זמינות" : "Confirm availability", detail: label, href: "/inbox" });
    }
    if (s.offerResponse === "pending") {
      out.push({ id: `of_${s.id}`, title: he ? "לענות על הצעה" : "Answer an offer", detail: label, href: "/inbox" });
    }
  }
  return out;
}

type AgendaStore = {
  events: AgendaEvent[];
  add: (e: Omit<AgendaEvent, "id">) => AgendaEvent;
  remove: (id: string) => void;
};

export const useAgendaStore = create<AgendaStore>()(
  persist(
    (set, get) => ({
      events: [],
      add: (e) => {
        const ev = { ...e, id: `ev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` };
        set({ events: [...get().events, ev] });
        return ev;
      },
      remove: (id) => set({ events: get().events.filter((x) => x.id !== id) }),
    }),
    { name: "castit_agenda_v1", storage: createJSONStorage(() => localStorage) }
  )
);

export function eventTime(e: AgendaEvent): number {
  // All-day dates count from 09:00 local so reminders land in the morning.
  return e.start.length <= 10 ? new Date(`${e.start}T09:00`).getTime() : new Date(e.start).getTime();
}

export function getAgenda(userId: string | null, he = true) {
  const items = getMyAuditions(userId);
  const events = [...auditionEvents(items, he), ...useAgendaStore.getState().events]
    .filter((e) => !Number.isNaN(eventTime(e)))
    .sort((a, b) => eventTime(a) - eventTime(b));
  return { events, actions: auditionActions(items, he), items };
}

/** Plain-text briefing Aria gets with every message. */
export function agendaBriefing(userId: string | null): string {
  const now = Date.now();
  const { events, actions, items } = getAgenda(userId, false);
  const fmt = (e: AgendaEvent) =>
    `- [${e.kind}] ${e.title} — ${e.start}${e.location ? ` @ ${e.location}` : ""}${e.note ? ` (${e.note})` : ""}`;
  const upcoming = events.filter((e) => eventTime(e) >= now - 3600_000).slice(0, 25);
  const active = items.filter((i) => !["booked", "rejected"].includes(i.submission.stage));
  return [
    `Now: ${new Date().toISOString()} (user's local timezone offset ${-new Date().getTimezoneOffset() / 60}h)`,
    `Active auditions (${active.length}):`,
    ...active.slice(0, 20).map(({ submission: s, role, project }) =>
      `- ${role.name} · ${project.title} — stage: ${s.stage}${s.inviteDeadline || role.deadline ? `, tape due ${s.inviteDeadline || role.deadline}` : ""}${s.shootDates || role.shootDates ? `, shoot ${s.shootDates || role.shootDates}` : ""}${s.payOffered ? `, pay ${s.payOffered}` : ""}`),
    `Calendar (upcoming):`,
    ...(upcoming.length ? upcoming.map(fmt) : ["- (empty)"]),
    `Waiting on the user:`,
    ...(actions.length ? actions.map((a) => `- ${a.title}: ${a.detail}`) : ["- nothing"]),
  ].join("\n");
}

// ── Availability blocks (busy / available days) ─────────────
export type AvailBlock = { date: string; status: "busy" | "available"; reason?: string };
const BLOCKS_KEY = "castit_calendar_blocks";

export function loadBlocks(): AvailBlock[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(BLOCKS_KEY) || "[]"); } catch { return []; }
}
export function saveBlocks(blocks: AvailBlock[]) {
  try { localStorage.setItem(BLOCKS_KEY, JSON.stringify(blocks)); } catch {}
}
/** Mark every day in [from, to] (YYYY-MM-DD) with a status. */
export function setBlockRange(from: string, to: string, status: AvailBlock["status"], reason?: string) {
  const days: string[] = [];
  const d = new Date(`${from}T12:00`);
  const end = new Date(`${(to || from)}T12:00`);
  for (let i = 0; d <= end && i < 366; i++) { days.push(localIso(d)); d.setDate(d.getDate() + 1); }
  const next = loadBlocks().filter((b) => !days.includes(b.date));
  for (const date of days) next.push({ date, status, reason });
  saveBlocks(next);
  return days.length;
}
export function localIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
