"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { useT } from "@/lib/i18n";
import { blockUser, sendReport, type ReportKind } from "@/lib/cloud/safety";
import { isRealUserId } from "@/lib/cloud/config";

const REASONS: { id: string; he: string; en: string }[] = [
  { id: "harassment", he: "הטרדה או בריונות", en: "Harassment or bullying" },
  { id: "sexual", he: "תוכן מיני או פנייה לא הולמת", en: "Sexual content or inappropriate approach" },
  { id: "minor", he: "פגיעה אפשרית בקטין/ה", en: "Possible harm to a minor" },
  { id: "fake", he: "פרופיל מזויף או התחזות", en: "Fake profile or impersonation" },
  { id: "scam", he: "הונאה או בקשת כסף", en: "Scam or asking for money" },
  { id: "spam", he: "ספאם", en: "Spam" },
  { id: "hate", he: "שנאה או אלימות", en: "Hate or violence" },
  { id: "other", he: "משהו אחר", en: "Something else" },
];

const WHAT: Record<ReportKind, { he: string; en: string }> = {
  user: { he: "דיווח על משתמש", en: "Report user" },
  reel: { he: "דיווח על סרטון", en: "Report video" },
  comment: { he: "דיווח על תגובה", en: "Report comment" },
  message: { he: "דיווח על שיחה", en: "Report conversation" },
};

/** Bottom sheet: pick a reason, add details, optionally block the person too. */
export function ReportSheet({ kind, targetUser, targetId, onClose, onBlocked }: {
  kind: ReportKind; targetUser?: string; targetId?: string; onClose: () => void; onBlocked?: () => void;
}) {
  const { lang } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(kind === "user" || kind === "message");
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const canBlock = isRealUserId(targetUser);

  async function submit() {
    if (!reason || state === "busy") return;
    setState("busy");
    const ok = await sendReport({ kind, targetUser, targetId, reason, details });
    if (ok && alsoBlock && canBlock && targetUser) {
      if (await blockUser(targetUser)) onBlocked?.();
    }
    setState(ok ? "done" : "failed");
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
      <motion.div
        role="dialog" aria-modal="true" aria-label={L(WHAT[kind].he, WHAT[kind].en)}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed bottom-0 inset-x-0 max-w-[440px] mx-auto z-[61] bg-bg-elevated text-text border-t border-border rounded-t-3xl max-h-[85dvh] flex flex-col"
        dir={he ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h3 className="font-display text-lg">{L(WHAT[kind].he, WHAT[kind].en)}</h3>
          <button onClick={onClose} aria-label={L("סגירה", "Close")} className="w-10 h-10 rounded-full hover:bg-bg-muted grid place-items-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {state === "done" ? (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gold/15 text-gold grid place-items-center"><Check className="w-6 h-6" /></div>
            <p className="font-semibold mt-4">{L("תודה, הדיווח התקבל", "Thanks, we got your report")}</p>
            <p className="text-sm text-text-muted mt-1">
              {alsoBlock && canBlock
                ? L("נבדוק אותו בהקדם. חסמנו גם את המשתמש, והוא לא יוכל לראות אתכם או לפנות אליכם.", "We'll review it soon. We also blocked this user, so they can't see or contact you.")
                : L("נבדוק אותו בהקדם.", "We'll review it soon.")}
            </p>
            <button onClick={onClose} className="mt-6 h-11 px-6 rounded-full bg-gold text-on-accent font-semibold">{L("סגירה", "Close")}</button>
          </div>
        ) : (
          <div className="overflow-y-auto px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
            <p className="text-sm text-text-muted mb-3">{L("מה הבעיה?", "What's wrong?")}</p>
            <div className="space-y-2" role="radiogroup">
              {REASONS.map((r) => (
                <button key={r.id} role="radio" aria-checked={reason === r.id} onClick={() => setReason(r.id)}
                  className={`w-full text-start px-4 h-12 rounded-2xl border text-sm flex items-center justify-between ${reason === r.id ? "border-gold bg-gold/10" : "border-border"}`}>
                  {L(r.he, r.en)}
                  {reason === r.id && <Check className="w-4 h-4 text-gold" />}
                </button>
              ))}
            </div>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} dir="auto"
              placeholder={L("פרטים נוספים (לא חובה)", "More details (optional)")}
              aria-label={L("פרטים נוספים", "More details")}
              className="mt-4 w-full p-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold" />
            {canBlock && (
              <label className="mt-3 flex items-center gap-3 text-sm">
                <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} className="w-5 h-5 accent-[var(--color-gold,#FFD43B)]" />
                {L("לחסום גם את המשתמש", "Also block this user")}
              </label>
            )}
            {state === "failed" && <p className="mt-3 text-xs text-terra" role="alert">{L("הדיווח לא נשלח. בדקו שאתם מחוברים ונסו שוב.", "Couldn't send. Check you're signed in and try again.")}</p>}
            <button onClick={submit} disabled={!reason || state === "busy"}
              className="mt-5 w-full h-12 rounded-full bg-gold text-on-accent font-semibold disabled:opacity-40">
              {state === "busy" ? L("שולח…", "Sending…") : L("שליחת דיווח", "Send report")}
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}
