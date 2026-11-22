"use client";
import { useState } from "react";
import { BellRing, MessageCircle, Check } from "lucide-react";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { markReminded, type Role, type Project, type Submission } from "@/lib/projects-store";
import { isRealUserId } from "@/lib/cloud/config";
import { sendPush } from "@/lib/cloud/push";

const COOLDOWN_MS = 12 * 3600 * 1000;

/**
 * Actors who were invited but haven't sent a tape yet: one tap sends each of
 * them a phone notification, and a WhatsApp message (with the deadline) is
 * ready for anyone who isn't on the app or didn't turn notifications on.
 */
export function TapeReminderCard({ role, project, subs, onChanged }: { role: Role; project: Project | null; subs: Submission[]; onChanged: () => void }) {
  const { lang } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const [sent, setSent] = useState(0);
  const waiting = subs.filter((s) => s.stage === "invited" && (s.tapes?.length ?? 0) === 0);
  if (waiting.length === 0) return null;
  const due = waiting.filter((s) => !s.remindedAt || Date.now() - new Date(s.remindedAt).getTime() > COOLDOWN_MS);
  const deadline = role.deadline ? new Date(role.deadline) : null;
  // Calendar days, so "today"/"tomorrow" match the date people see.
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysLeft = deadline ? Math.round((startOfDay(deadline) - startOfDay(new Date())) / 86400000) : null;
  const when = deadline
    ? daysLeft! <= 0 ? L("היום", "today") : daysLeft === 1 ? L("מחר", "tomorrow") : deadline.toLocaleDateString(he ? "he-IL" : "en-US", { weekday: "long", day: "numeric", month: "long" })
    : null;
  const text = L(
    `היי! תזכורת לגבי האודישן ל${role.name}${project?.title ? ` ב${project.title}` : ""}. ${when ? `הטייפ צריך להגיע עד ${when}. ` : ""}את ההוראות והסצנה אפשר למצוא באפליקציה CastIt, ושם גם מצלמים ושולחים: ${typeof window !== "undefined" ? window.location.origin : ""}/inbox`,
    `Hi! A reminder about the audition for ${role.name}${project?.title ? ` in ${project.title}` : ""}. ${when ? `The tape is due ${when}. ` : ""}Sides and instructions are in CastIt, where you can record and send it: ${typeof window !== "undefined" ? window.location.origin : ""}/inbox`,
  );

  function remindAll() {
    let n = 0;
    for (const s of due) {
      if (isRealUserId(s.talentId)) sendPush(s.talentId, "reminder", { role: role.name, href: `/inbox/${s.id}/record` });
      markReminded(s.id);
      n++;
    }
    setSent(n);
    haptic("success");
    onChanged();
  }

  return (
    <div className="rounded-2xl border border-gold/40 bg-gold/5 p-3.5 space-y-2.5">
      <div className="flex items-start gap-2.5">
        <BellRing className="w-5 h-5 text-gold shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">
            {waiting.length === 1 ? L("שחקן/ית אחד/ת עוד לא שלח/ה טייפ", "1 actor hasn't sent a tape") : L(`${waiting.length} שחקנים עוד לא שלחו טייפ`, `${waiting.length} actors haven't sent a tape`)}
            {daysLeft !== null && daysLeft >= 0 && daysLeft <= 3 && <span className="text-gold"> · {daysLeft <= 0 ? L("הדדליין היום", "due today") : daysLeft === 1 ? L("הדדליין מחר", "due tomorrow") : L(`${daysLeft} ימים לדדליין`, `${daysLeft} days left`)}</span>}
          </div>
          <div className="text-[0.6875rem] text-text-muted truncate">{waiting.map((s) => s.talentName.split(" ")[0]).join(", ")}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={remindAll} disabled={due.length === 0}
          className="h-10 rounded-xl bg-gold text-on-accent text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
          {sent ? <><Check className="w-4 h-4" aria-hidden /> {L("נשלח", "Sent")}</> : due.length === 0 ? L("נשלחה תזכורת היום", "Reminded today") : <><BellRing className="w-4 h-4" aria-hidden /> {L("תזכורת באפליקציה", "Remind in app")}</>}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
          className="h-10 rounded-xl border border-border bg-bg text-sm font-semibold inline-flex items-center justify-center gap-1.5">
          <MessageCircle className="w-4 h-4 text-[#1a9e4b]" aria-hidden /> {L("תזכורת בוואטסאפ", "WhatsApp reminder")}
        </a>
      </div>
    </div>
  );
}
