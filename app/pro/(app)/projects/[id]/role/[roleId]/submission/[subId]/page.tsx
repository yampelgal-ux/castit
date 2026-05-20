"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, MessageCircle, ArrowRight, FileVideo, Calendar } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import {
  getSubmission, decideSubmission, getRole,
  type Submission, type SubmissionStatus,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";

const CALLBACK_TEMPLATE = "Loved your tape — we'd like to bring you in for a callback. Production will be in touch with details shortly.";
const REJECT_TEMPLATE   = "Thank you for submitting. We've gone in a different direction for this role, but we'll keep your profile on file for future projects.";

export default function SubmissionPage() {
  const { id, roleId, subId } = useParams<{ id: string; roleId: string; subId: string }>();
  const router = useRouter();
  const [sub, setSub] = useState<Submission | null>(null);
  const [roleName, setRoleName] = useState("");
  const [decision, setDecision] = useState<SubmissionStatus | null>(null);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const s = getSubmission(subId);
    setSub(s ?? null);
    if (s) setRoleName(getRole(s.roleId)?.name ?? "");
  }, [subId]);

  if (!sub) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="Submission" />
        <EmptyState icon={FileVideo} title="Not found" />
      </div>
    );
  }

  function openDecision(status: SubmissionStatus) {
    setDecision(status);
    setMessage(status === "callback" ? CALLBACK_TEMPLATE : REJECT_TEMPLATE);
  }

  function submit() {
    if (!decision) return;
    decideSubmission(subId, decision, message.trim());
    setSub(getSubmission(subId) ?? null);
    setConfirmed(true);
    setTimeout(() => {
      setConfirmed(false);
      setDecision(null);
      router.back();
    }, 1600);
  }

  const decided = sub.status !== "pending";

  return (
    <div className="min-h-dvh bg-bg pb-44">
      <Header back title="Audition tape" />

      <div className="px-5 pt-3 space-y-4">
        {/* Talent header */}
        <div className="flex items-center gap-3">
          <img
            src={sub.talentPhoto}
            alt={sub.talentName}
            className="w-14 h-14 rounded-2xl object-cover"
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight truncate">{sub.talentName}</h1>
            <p className="text-[11px] text-text-muted truncate">For: {roleName}</p>
          </div>
          <StatusPill status={sub.status} />
        </div>

        {/* Video */}
        <div className="rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[70dvh] relative">
          {sub.videoUrl ? (
            <video
              src={sub.videoUrl}
              poster={sub.posterUrl}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-text-muted">
              <FileVideo className="w-10 h-10" />
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="rounded-2xl bg-bg-elevated border border-border p-4 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            <Calendar className="w-3 h-3" /> Submitted {new Date(sub.submittedAt).toLocaleDateString()}
          </div>
          {sub.note && <p className="text-sm leading-relaxed">{sub.note}</p>}
          {decided && sub.proMessage && (
            <div className="mt-2 pt-3 border-t border-border">
              <div className="text-[10px] uppercase tracking-widest text-gold mb-1">Your message to the talent</div>
              <p className="text-xs leading-relaxed">{sub.proMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* Decision bar — sits above the BottomNav */}
      {!decided && (
        <div className="fixed bottom-[72px] inset-x-0 max-w-[440px] mx-auto p-4 glass border-t border-border z-40">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => openDecision("rejected")}
              className="h-13 py-3 rounded-2xl border border-border bg-bg-elevated text-text font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <XCircle className="w-4 h-4" /> Pass
            </button>
            <button
              onClick={() => openDecision("callback")}
              className="h-13 py-3 rounded-2xl bg-success text-bg font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <CheckCircle2 className="w-4 h-4" /> Callback
            </button>
          </div>
        </div>
      )}

      {/* Decision sheet */}
      <AnimatePresence>
        {decision && !confirmed && (
          <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDecision(null)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5"
            >
              <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />
              <h2 className="font-display text-2xl mb-1">
                {decision === "callback" ? "Bring them in for a callback?" : "Pass on this talent?"}
              </h2>
              <p className="text-sm text-text-muted mb-4">
                {decision === "callback"
                  ? "They'll get a notification with your message."
                  : "They'll be notified — politely — that you've moved on."}
              </p>

              <div className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
                Message to {sub.talentName.split(" ")[0]}
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
              />

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={() => setDecision(null)}
                  className="h-12 rounded-2xl border border-border bg-bg text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  className={cn(
                    "h-12 rounded-2xl font-semibold flex items-center justify-center gap-2",
                    decision === "callback" ? "bg-success text-bg" : "bg-danger text-white"
                  )}
                >
                  {decision === "callback" ? "Send callback" : "Send & pass"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation toast */}
      <AnimatePresence>
        {confirmed && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center pointer-events-none"
          >
            <div className={cn(
              "px-5 py-4 rounded-2xl flex items-center gap-3 shadow-2xl",
              decision === "callback" ? "bg-success text-bg" : "bg-bg-elevated border border-border text-text"
            )}>
              {decision === "callback" ? <CheckCircle2 className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
              <div>
                <div className="font-semibold text-sm">
                  {decision === "callback" ? "Callback sent" : "Talent notified"}
                </div>
                <div className="text-[11px] opacity-80">
                  {sub.talentName} will get your message
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusPill({ status }: { status: SubmissionStatus }) {
  const map = {
    pending:  { label: "New",      cls: "bg-gold/15 text-gold border-gold/30" },
    callback: { label: "Callback", cls: "bg-success/15 text-success border-success/30" },
    rejected: { label: "Passed",   cls: "bg-bg text-text-muted border-border" },
  };
  const s = map[status];
  return (
    <span className={cn("text-[10px] px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wider whitespace-nowrap", s.cls)}>
      {s.label}
    </span>
  );
}
