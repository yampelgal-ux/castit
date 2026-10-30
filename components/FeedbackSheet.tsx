"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";
import { sendReport } from "@/lib/cloud/safety";
import { cn } from "@/lib/utils";

const KINDS = [["bug", "משהו לא עובד", "Something's broken"], ["idea", "רעיון לשיפור", "An idea"], ["other", "אחר", "Other"]] as const;

/** Testers tell us what broke or what they'd like. Lands in /admin → feedback. */
export function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const { lang, dir } = useT();
  const L = (h: string, e: string) => (lang === "he" ? h : e);
  const path = usePathname();
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>("bug");
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "failed">("idle");

  async function send() {
    setState("busy");
    const device = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 160) : "";
    const ok = await sendReport({ kind: "feedback", reason: kind, targetId: path ?? undefined, details: `${text.trim()}\n\n— ${device}` });
    setState(ok ? "sent" : "failed");
    if (ok) setTimeout(onClose, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto" dir={dir}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} role="dialog" aria-modal="true" aria-labelledby="fb-title"
        className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 id="fb-title" className="font-display text-2xl">{L("שליחת משוב", "Send feedback")}</h2>
          <button onClick={onClose} aria-label={L("סגירה", "Close")} className="w-9 h-9 grid place-items-center rounded-full hover:bg-bg"><X className="w-5 h-5" /></button>
        </div>
        {state === "sent" ? (
          <p className="py-8 text-center text-sm flex flex-col items-center gap-2" role="status">
            <Check className="w-8 h-8 text-sage" aria-hidden /> {L("תודה! קיבלנו.", "Thanks! Got it.")}
          </p>
        ) : (
          <>
            <div className="flex gap-2" role="radiogroup" aria-label={L("סוג", "Type")}>
              {KINDS.map(([id, he, en]) => (
                <button key={id} role="radio" aria-checked={kind === id} onClick={() => setKind(id)}
                  className={cn("flex-1 h-10 rounded-full border text-xs font-semibold", kind === id ? "bg-gold text-on-accent border-gold" : "border-border")}>
                  {L(he, en)}
                </button>
              ))}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} dir="auto" autoFocus
              aria-label={L("מה קרה?", "What happened?")}
              placeholder={kind === "bug" ? L("מה ניסית לעשות ומה קרה בפועל?", "What did you try, and what happened?") : L("ספרו לנו…", "Tell us…")}
              className="mt-3 w-full px-3 py-2 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
            <p className="text-[0.6875rem] text-text-subtle mt-1">{L("נצרף אוטומטית את המסך שהיית בו ואת סוג המכשיר.", "We attach the screen you were on and your device type.")}</p>
            <button onClick={send} disabled={state === "busy" || text.trim().length < 3}
              className="mt-4 w-full h-12 rounded-full bg-gold text-on-accent font-semibold disabled:opacity-40">
              {state === "busy" ? "…" : L("שליחה", "Send")}
            </button>
            {state === "failed" && <p className="text-xs text-terra mt-2" role="alert">{L("השליחה לא הצליחה. צריך להיות מחובר/ת לחשבון ולרשת.", "Couldn't send. You need to be signed in and online.")}</p>}
          </>
        )}
      </motion.div>
    </div>
  );
}
