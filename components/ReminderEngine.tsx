"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { getAgenda, getMyAuditions, eventTime, type AgendaEvent } from "@/lib/agenda";
import { addNotification } from "@/lib/notifications-store";
import { useLangStore } from "@/lib/i18n";

// Aria's reminder loop for talents. Runs while the app is open (and when it
// comes back to the foreground): reminds before self-tape deadlines,
// callbacks and calendar events, and announces newly received auditions.
// Sent reminders are remembered under a castit_* key, so a reminder that
// fired on one device isn't repeated on another.

const SENT_KEY = "castit_reminders_sent_v1";
const SEEN_KEY = "castit_seen_invites_v1";
const TICK_MS = 60_000;

function readSet(key: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch { return null; }
}
function writeSet(key: string, set: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...set].slice(-500))); } catch {}
}

function systemNotify(title: string, body: string, href?: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, icon: "/icons/icon-192.png", tag: href });
    n.onclick = () => { window.focus(); if (href) window.location.href = href; };
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
    navigator.serviceWorker?.ready.then((reg) => reg.showNotification(title, { body, icon: "/icons/icon-192.png", data: { href } })).catch(() => {});
  }
}

function leadHours(e: AgendaEvent, s: ReturnType<typeof useSettings.getState>): number | null {
  if (e.kind === "reminder") return 0;
  if (e.kind === "self_tape") return s.remindDeadlines ? s.deadlineReminderHours : null;
  if (e.kind === "hold") return null;
  return s.remindEvents ? s.eventReminderHours : null;
}

function fmtWhen(ms: number, he: boolean) {
  return new Date(ms).toLocaleString(he ? "he-IL" : "en-US", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function ReminderEngine() {
  const userId = useStore((s) => s.userId);
  const role = useStore((s) => s.profile.role);

  useEffect(() => {
    if (role === "Casting Pro") return;

    function tick() {
      const settings = useSettings.getState();
      const he = useLangStore.getState().lang === "he";
      const now = Date.now();

      // 1) New auditions since last check
      const items = getMyAuditions(userId);
      const ids = items.filter((i) => i.submission.stage === "invited").map((i) => i.submission.id);
      const seen = readSet(SEEN_KEY);
      if (!seen) {
        writeSet(SEEN_KEY, new Set(ids)); // first run: don't announce the backlog
      } else {
        for (const it of items) {
          const id = it.submission.id;
          if (it.submission.stage !== "invited" || seen.has(id)) continue;
          seen.add(id);
          const title = he ? "אודישן חדש!" : "New audition!";
          const body = `${it.role.name} · ${it.project.title}`;
          addNotification({ audience: "talent", kind: "invite", title, body, href: `/inbox/${id}/record` });
          if (settings.systemNotifications) systemNotify(title, body, `/inbox/${id}/record`);
        }
        writeSet(SEEN_KEY, seen);
      }

      // 2) Reminders before deadlines / callbacks / events
      const sent = readSet(SENT_KEY) ?? new Set<string>();
      const { events } = getAgenda(userId, he);
      for (const e of events) {
        const lead = leadHours(e, settings);
        if (lead == null) continue;
        const at = eventTime(e);
        const remindAt = at - lead * 3600_000;
        const key = `${e.id}@${e.start}@${lead}`;
        // Fire inside the window [remindAt, event); reminders also fire up to 1h late.
        const windowEnd = e.kind === "reminder" ? at + 3600_000 : at;
        if (now < remindAt || now > windowEnd || sent.has(key)) continue;
        sent.add(key);
        const title = e.kind === "reminder"
          ? (he ? "תזכורת" : "Reminder")
          : e.kind === "self_tape" ? (he ? "הדדליין לטייפ מתקרב" : "Self-tape deadline soon")
          : (he ? "בקרוב ביומן" : "Coming up");
        const body = `${e.title} · ${fmtWhen(at, he)}`;
        addNotification({ audience: "talent", kind: "reminder", title, body, href: e.href ?? "/calendar" });
        if (settings.systemNotifications) systemNotify(title, body, e.href ?? "/calendar");
      }
      writeSet(SENT_KEY, sent);
    }

    tick();
    const t = window.setInterval(tick, TICK_MS);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("castit:remote-update", tick);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("castit:remote-update", tick);
    };
  }, [userId, role]);

  return null;
}
