"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, Clock, Calendar, DollarSign, Send, Check, X, Megaphone } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { getAudition, incrementApplicants } from "@/lib/auditions-store";
import { useStore } from "@/lib/store";
import type { Audition } from "@/lib/mock-data";
import { haptic } from "@/lib/haptics";

export default function PublicAuditionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { markApplied, appliedCastings } = useStore();
  const [a, setA] = useState<Audition | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => { setA(getAudition(id) ?? null); }, [id]);

  if (!a) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="Audition" />
        <EmptyState icon={Megaphone} title="Not found" description="This audition may have closed." />
      </div>
    );
  }

  const alreadyApplied = appliedCastings.has(a.id);

  function apply() {
    incrementApplicants(a!.id);
    markApplied(a!.id);
    setSent(true);
    haptic("success");
    setTimeout(() => setShowApply(false), 1400);
  }

  return (
    <div className="min-h-dvh bg-bg pb-32">
      <Header back title={a.title} />

      <div className="px-5 pt-3 space-y-4">
        <div className="rounded-2xl bg-bg-elevated border border-border p-5">
          <div className="text-[10px] uppercase tracking-widest text-gold">{a.type}</div>
          <h1 className="font-display text-2xl tracking-editorial mt-0.5">{a.title}</h1>
          <p className="text-[12px] text-text-muted mt-1">{a.studio}</p>

          <div className="flex flex-wrap gap-3 text-[11px] text-text-muted mt-4">
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.location}</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> by {a.deadline}</span>
            {a.shootDates && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {a.shootDates}</span>}
            {a.paid && <span className="inline-flex items-center gap-1 text-success font-semibold"><DollarSign className="w-3 h-3" /> {a.fee || "Paid"}</span>}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-[10px] uppercase tracking-widest text-text-muted mb-1.5">About the role</div>
            <p className="text-sm leading-relaxed">{a.description}</p>
          </div>

          {a.selfTapeInstructions && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-[10px] uppercase tracking-widest text-gold mb-1.5">Self-tape instructions</div>
              <p className="text-sm leading-relaxed text-text">{a.selfTapeInstructions}</p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border text-[11px] text-text-muted tnum">
            {a.applicants} talent{a.applicants !== 1 ? "s" : ""} applied so far
          </div>
        </div>
      </div>

      {/* Apply CTA */}
      <div className="fixed bottom-20 inset-x-0 max-w-[440px] mx-auto px-4 z-30">
        {alreadyApplied ? (
          <div className="h-14 rounded-2xl bg-success/15 border border-success/30 text-success font-semibold flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> You've applied
          </div>
        ) : (
          <button
            onClick={() => { setShowApply(true); haptic("medium"); }}
            className="w-full h-14 rounded-2xl bg-gold text-bg font-semibold inline-flex items-center justify-center gap-2 shadow-lg shadow-gold/20"
          >
            <Send className="w-4 h-4" /> Apply to this audition
          </button>
        )}
      </div>

      {/* Apply modal */}
      {showApply && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6">
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-[440px] bg-bg-elevated border border-border rounded-3xl p-6 space-y-4"
          >
            {sent ? (
              <div className="flex flex-col items-center py-4 gap-3">
                <div className="w-14 h-14 rounded-full bg-success/15 grid place-items-center">
                  <Check className="w-7 h-7 text-success" strokeWidth={2.5} />
                </div>
                <p className="font-display text-xl">You're in</p>
                <p className="text-text-muted text-sm text-center">{a.studio} can now view your profile and reach out.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{a.title}</div>
                    <div className="text-text-muted text-xs">{a.studio}</div>
                  </div>
                  <button onClick={() => setShowApply(false)} className="w-8 h-8 rounded-full bg-bg grid place-items-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider">Cover note (optional)</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Tell them why this role fits you…"
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-bg border border-border outline-none text-sm focus:border-gold/40 resize-none"
                  />
                </div>

                <button
                  onClick={apply}
                  className="w-full h-12 rounded-2xl bg-gold text-bg font-semibold inline-flex items-center justify-center gap-2"
                >
                  Submit application <Send className="w-4 h-4" />
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
