"use client";
import { motion } from "framer-motion";
import {
  Sparkles, CheckCircle2, AlertCircle, ThumbsUp, Pause, ThumbsDown,
  Mic, Target, Activity, Heart,
} from "lucide-react";
import type { TapeAnalysis } from "@/lib/projects-store";
import { cn } from "@/lib/utils";

const REC_META: Record<TapeAnalysis["recommendation"], {
  label: string;
  icon: typeof ThumbsUp;
  cls: string;
}> = {
  callback: { label: "Callback",     icon: ThumbsUp,   cls: "bg-success/15 text-success border-success/30" },
  hold:     { label: "Hold (maybe)", icon: Pause,      cls: "bg-gold/15 text-gold border-gold/30" },
  pass:     { label: "Pass",         icon: ThumbsDown, cls: "bg-danger/15 text-danger border-danger/30" },
};

export function TapeAnalysisCard({ analysis }: { analysis: TapeAnalysis }) {
  const rec = REC_META[analysis.recommendation];
  const RecIcon = rec.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-plum/10 via-bg-elevated to-bg-elevated border border-plum/30 overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 p-3 border-b border-border bg-plum/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-plum-light" />
          <span className="text-[10px] uppercase tracking-widest text-plum-light font-semibold">
            Aria Tape Analysis
          </span>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap",
          rec.cls
        )}>
          <RecIcon className="w-2.5 h-2.5" /> {rec.label}
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* Summary line */}
        <p className="text-sm text-text leading-relaxed">{analysis.summary}</p>

        {/* Top-line indicators */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-bg p-2.5 border border-border">
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-text-muted">
              <Mic className="w-3 h-3" /> Slate
            </div>
            <div className={cn(
              "text-sm font-semibold mt-0.5 inline-flex items-center gap-1",
              analysis.slateComplete ? "text-success" : "text-danger"
            )}>
              {analysis.slateComplete ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Complete</>
              ) : (
                <><AlertCircle className="w-3.5 h-3.5" /> Missing</>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-bg p-2.5 border border-border">
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-text-muted">
              <Target className="w-3 h-3" /> Lines accuracy
            </div>
            <div className="text-sm font-semibold mt-0.5 tnum">
              {typeof analysis.linesAccuracy === "number" ? `${analysis.linesAccuracy}%` : "—"}
            </div>
          </div>
        </div>

        {/* Pacing + emotion notes */}
        {(analysis.pacingNote || analysis.emotionalChoice) && (
          <div className="space-y-1.5">
            {analysis.pacingNote && (
              <div className="flex items-start gap-2 text-[12px]">
                <Activity className="w-3 h-3 text-gold shrink-0 mt-0.5" />
                <span><span className="text-gold font-semibold">קצב: </span>{analysis.pacingNote}</span>
              </div>
            )}
            {analysis.emotionalChoice && (
              <div className="flex items-start gap-2 text-[12px]">
                <Heart className="w-3 h-3 text-plum-light shrink-0 mt-0.5" />
                <span><span className="text-plum-light font-semibold">בחירה: </span>{analysis.emotionalChoice}</span>
              </div>
            )}
          </div>
        )}

        {/* Strengths */}
        {analysis.strengths.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-success font-semibold mb-1">
              חוזקות
            </div>
            <ul className="space-y-1">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="text-[12px] text-text flex items-start gap-2">
                  <span className="text-success mt-0.5">+</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concerns */}
        {analysis.concerns.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-danger font-semibold mb-1">
              נקודות לתשומת לב
            </div>
            <ul className="space-y-1">
              {analysis.concerns.map((c, i) => (
                <li key={i} className="text-[12px] text-text flex items-start gap-2">
                  <span className="text-danger mt-0.5">−</span>{c}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-[9px] text-text-subtle pt-1 border-t border-border">
          ניתוח AI על בסיס transcript. לא מחליף שיפוט אנושי.
        </div>
      </div>
    </motion.div>
  );
}
