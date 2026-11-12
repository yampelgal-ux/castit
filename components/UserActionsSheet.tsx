"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flag, Ban, Share2, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { blockUser, unblockUser, useIsBlockedByMe, type ReportKind } from "@/lib/cloud/safety";
import { ReportSheet } from "./ReportSheet";

/** "…" menu for another person: share, report, block / unblock. */
export function UserActionsSheet({ userId, name, reportKind = "user", targetId, onShare, onBlocked, onClose }: {
  userId: string; name: string; reportKind?: ReportKind; targetId?: string;
  onShare?: () => void; onBlocked?: () => void; onClose: () => void;
}) {
  const { lang } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const blocked = useIsBlockedByMe(userId);
  const [step, setStep] = useState<"menu" | "confirm" | "report">("menu");
  const [busy, setBusy] = useState(false);

  async function toggleBlock() {
    setBusy(true);
    const ok = blocked ? await unblockUser(userId) : await blockUser(userId);
    setBusy(false);
    if (ok && !blocked) onBlocked?.();
    onClose();
  }

  if (step === "report") {
    return <ReportSheet kind={reportKind} targetUser={userId} targetId={targetId} onClose={onClose} onBlocked={onBlocked} />;
  }

  return (
    <AnimatePresence>
      <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
      <motion.div key="sheet"
        role="dialog" aria-modal="true" aria-label={name}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed bottom-0 inset-x-0 max-w-[440px] mx-auto z-[61] bg-bg-elevated text-text border-t border-border rounded-t-3xl px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)]"
        dir={he ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg truncate">{name}</h3>
          <button onClick={onClose} aria-label={L("סגירה", "Close")} className="w-10 h-10 rounded-full hover:bg-bg-muted grid place-items-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === "confirm" ? (
          <div>
            <p className="text-sm text-text-muted leading-relaxed">
              {L(
                `אחרי החסימה לא תראו זה את זה: לא פרופיל, לא סרטונים, לא הודעות ולא תגובות. לא נודיע ל${name} על החסימה.`,
                `After blocking you won't see each other: no profile, videos, messages or comments. ${name} won't be told.`
              )}
            </p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setStep("menu")} className="flex-1 h-12 rounded-full border border-border font-semibold">{L("ביטול", "Cancel")}</button>
              <button onClick={toggleBlock} disabled={busy} className="flex-1 h-12 rounded-full bg-danger text-white font-semibold disabled:opacity-50">
                {busy ? "…" : L("חסימה", "Block")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {onShare && (
              <Row icon={Share2} label={L("שיתוף הפרופיל", "Share profile")} onClick={() => { onShare(); onClose(); }} />
            )}
            <Row icon={Flag} label={L("דיווח", "Report")} onClick={() => setStep("report")} />
            <Row icon={Ban} danger={!blocked}
              label={blocked ? L("ביטול חסימה", "Unblock") : L("חסימה", "Block")}
              onClick={() => (blocked ? void toggleBlock() : setStep("confirm"))} />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function Row({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-full h-12 px-4 rounded-2xl border border-border flex items-center gap-3 text-sm font-medium ${danger ? "text-danger" : ""}`}>
      <Icon className="w-4 h-4" aria-hidden /> {label}
    </button>
  );
}
