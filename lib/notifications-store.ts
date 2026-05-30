"use client";

// In-app notifications backed by localStorage. Powers the bell badge,
// the /notifications feed, and any per-event toast.

export type NotifKind =
  | "invite"        // pro invited talent
  | "tape_in"       // tape submitted to pro
  | "callback"      // pro moved talent to callback
  | "hold"          // pro put talent on hold (timer)
  | "avail_check"   // pro asked availability
  | "offered"       // pro extended offer
  | "booked"        // booking confirmed
  | "rejected"      // pro passed
  | "vote"          // director vote received
  | "message"       // DM
  | "like"          // social like on reel
  | "comment"       // social comment on reel
  | "casting"       // new casting match
  | "application";  // application status change

export type AppNotification = {
  id: string;
  audience: "talent" | "pro";   // who should see it
  kind: NotifKind;
  title: string;
  body: string;
  href?: string;                // deep link
  meta?: Record<string, string>; // arbitrary tags
  read: boolean;
  createdAt: string;
};

const KEY = "castit_notifications_v1";

function safeLoad(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch { return []; }
}

function safeSave(list: AppNotification[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

function newId(): string {
  return "n_" + Math.random().toString(36).slice(2, 10);
}

// ─── Reads ─────────────────────────────────────────
export function loadNotifications(audience?: "talent" | "pro"): AppNotification[] {
  const all = safeLoad().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  if (!audience) return all;
  return all.filter((n) => n.audience === audience);
}

export function unreadCount(audience?: "talent" | "pro"): number {
  return loadNotifications(audience).filter((n) => !n.read).length;
}

// ─── Writes ────────────────────────────────────────
export function addNotification(input: Omit<AppNotification, "id" | "read" | "createdAt">): AppNotification {
  const list = safeLoad();
  const notif: AppNotification = {
    id: newId(),
    read: false,
    createdAt: new Date().toISOString(),
    ...input,
  };
  list.unshift(notif);
  // Cap to prevent runaway growth
  safeSave(list.slice(0, 200));
  // Fire a custom event so the bell badge / page can refresh live
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("castit:notifications-changed"));
  }
  return notif;
}

export function markRead(id: string) {
  const list = safeLoad();
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], read: true };
  safeSave(list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("castit:notifications-changed"));
  }
}

export function markAllRead(audience?: "talent" | "pro") {
  const list = safeLoad().map((n) =>
    !audience || n.audience === audience ? { ...n, read: true } : n
  );
  safeSave(list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("castit:notifications-changed"));
  }
}

export function clearAll() {
  safeSave([]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("castit:notifications-changed"));
  }
}

// React hook: live-subscribes to the "changed" event so the bell badge
// re-renders without a page refresh whenever a new notification arrives.
// Imported lazily so server components don't choke.
import { useEffect, useState } from "react";
export function useUnreadCount(audience?: "talent" | "pro"): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    function refresh() { setCount(unreadCount(audience)); }
    refresh();
    if (typeof window === "undefined") return;
    window.addEventListener("castit:notifications-changed", refresh);
    // Also refresh when the tab regains focus
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("castit:notifications-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [audience]);
  return count;
}

// ─── Convenience helpers — called from action sites ─
export function notifyTalentInvited(talentName: string, projectTitle: string, roleName: string, subId?: string) {
  addNotification({
    audience: "talent",
    kind: "invite",
    title: `הזמנה לקרוא: ${roleName}`,
    body: `${projectTitle} — לחץ לפתוח את הסיידס ולהקליט`,
    href: subId ? `/inbox/${subId}/record` : "/inbox",
    meta: { talentName, projectTitle, roleName },
  });
}

export function notifyProTapeIn(talentName: string, roleName: string, submissionId: string, projectId: string, roleId: string) {
  addNotification({
    audience: "pro",
    kind: "tape_in",
    title: `טייפ חדש מ-${talentName}`,
    body: `עבור ${roleName} — לחץ לסקירה`,
    href: `/pro/projects/${projectId}/role/${roleId}/submission/${submissionId}`,
  });
}

export function notifyTalentStageChange(
  stage: NotifKind,
  talentName: string,
  projectTitle: string,
  roleName: string,
  subId?: string,
) {
  const titleMap: Record<string, string> = {
    callback:    `🎉 Callback ל-${roleName}!`,
    hold:        `מוחזק בHold: ${roleName}`,
    avail_check: `בדיקת זמינות: ${roleName}`,
    offered:     `🎬 הצעה רשמית: ${roleName}`,
    booked:      `✨ אושר! ${roleName}`,
    rejected:    `${roleName} — לא נבחר הפעם`,
  };
  const bodyMap: Record<string, string> = {
    callback:    `המלהק/ת רוצה אותך לסיבוב הבא של ${projectTitle}`,
    hold:        `${projectTitle} מחזיק/ה אותך — שמור זמינות`,
    avail_check: `${projectTitle} בודק/ת זמינות לצילומים`,
    offered:     `${projectTitle} שולח/ת הצעה רשמית`,
    booked:      `${projectTitle} — אושרת לתפקיד 🎉`,
    rejected:    `תודה על ההגשה — הלהקה ל${projectTitle} הלכה לכיוון אחר`,
  };
  addNotification({
    audience: "talent",
    kind: stage,
    title: titleMap[stage] ?? `Update: ${roleName}`,
    body: bodyMap[stage] ?? projectTitle,
    href: subId ? `/inbox` : undefined,
  });
}

export function notifyProDirectorVote(directorName: string, talentName: string, vote: "yes" | "maybe" | "no", slug: string) {
  const voteLabel = vote === "yes" ? "👍 Yes" : vote === "maybe" ? "🤔 Maybe" : "👎 No";
  addNotification({
    audience: "pro",
    kind: "vote",
    title: `${directorName} הצביע ${voteLabel}`,
    body: `על ${talentName} — לחץ לסקירה`,
    href: `/pro/approvals`,
  });
}
