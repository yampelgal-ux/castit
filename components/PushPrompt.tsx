"use client";
import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { enablePush, pushStatus, type PushStatus } from "@/lib/cloud/push";
import { useSettings } from "@/lib/settings-store";

const DISMISSED = "castit_push_prompt_dismissed_v1";

/** One-time card: turn on phone notifications so invites and messages aren't missed. */
export function PushPrompt() {
  const { lang } = useT();
  const L = (h: string, e: string) => (lang === "he" ? h : e);
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try { setHidden(!!localStorage.getItem(DISMISSED)); } catch { setHidden(false); }
    pushStatus().then(setStatus).catch(() => setStatus("unsupported"));
  }, []);
  if (hidden || status !== "off") return null;

  function dismiss() {
    try { localStorage.setItem(DISMISSED, "1"); } catch {}
    setHidden(true);
  }
  async function turnOn() {
    const r = await enablePush();
    setStatus(r);
    if (r === "on") useSettings.getState().set({ systemNotifications: true });
    if (r !== "off") dismiss();
  }

  return (
    <div className="mx-4 mt-3 p-4 rounded-2xl border border-border bg-bg-elevated flex items-start gap-3" role="status">
      <BellRing className="w-5 h-5 text-gold shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{L("לא לפספס הזמנות", "Don't miss an invite")}</p>
        <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{L("התראה לטלפון על הודעות, הזמנות לאודישן ותשובות, גם כשהאפליקציה סגורה.", "Get a phone notification for messages, audition invites and answers, even when the app is closed.")}</p>
        <button onClick={turnOn} className="mt-2 h-9 px-4 rounded-full bg-gold text-on-accent text-xs font-semibold">{L("הפעלת התראות", "Turn on notifications")}</button>
      </div>
      <button onClick={dismiss} aria-label={L("לא עכשיו", "Not now")} className="w-8 h-8 grid place-items-center rounded-full hover:bg-bg shrink-0"><X className="w-4 h-4" /></button>
    </div>
  );
}
