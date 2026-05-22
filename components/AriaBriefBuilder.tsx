"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, AlertCircle, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Output shape — same shape as the /pro/search Filters type, but partial.
// The page is responsible for merging this into its state.
export type ParsedFilters = {
  gender?: string[];
  ageRange?: [number, number];
  heightRange?: [number, number];
  ethnicities?: string[];
  bodyTypes?: string[];
  hairLengths?: string[];
  languages?: string[];
  accents?: string[];
  voiceTypes?: string[];
  skills?: string[];
  unionStatus?: string[];
  experienceLevels?: string[];
  locations?: string[];
  notes?: string;
};

type Props = {
  onApply: (filters: ParsedFilters) => void;
  onOpenManual: () => void;
};

export function AriaBriefBuilder({ onApply, onOpenManual }: Props) {
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedFilters | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  async function parse() {
    if (!brief.trim()) return;
    setLoading(true);
    setError(null);
    setParsed(null);
    try {
      const res = await fetch("/api/aria/parse-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: brief.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't parse brief.");
      } else {
        setParsed(data.filters);
        setDemo(!!data.demo);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function apply() {
    if (!parsed) return;
    onApply(parsed);
    setParsed(null);
    setBrief("");
  }

  const chips = parsed ? collectChips(parsed) : [];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gold/8 via-bg-elevated to-plum/8 border border-gold/30 overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-gold" />
        <span className="text-[10px] uppercase tracking-widest text-gold font-semibold">Describe the role</span>
        <button
          onClick={onOpenManual}
          className="ml-auto text-[10px] text-text-muted inline-flex items-center gap-1 hover:text-text"
        >
          <Settings2 className="w-3 h-3" /> Manual filters
        </button>
      </div>

      <div className="px-3 pb-3">
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={3}
          placeholder='e.g. "Female lead, 30s, Mediterranean, fluent Hebrew + Arabic, stage combat background, Tel Aviv based"'
          className="w-full px-3 py-2.5 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60 resize-none"
          disabled={loading}
        />

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={parse}
            disabled={loading || brief.trim().length < 3}
            className={cn(
              "flex-1 h-10 rounded-2xl text-sm font-semibold inline-flex items-center justify-center gap-2",
              loading || brief.trim().length < 3
                ? "bg-bg text-text-subtle"
                : "bg-gold text-bg",
            )}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Parsing…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Parse with Aria</>
            )}
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 px-3 py-2 rounded-xl bg-danger/10 border border-danger/30 text-[11px] text-danger flex items-start gap-1.5"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
            </motion.div>
          )}

          {parsed && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 rounded-2xl bg-bg border border-border p-3"
            >
              <div className="text-[10px] uppercase tracking-widest text-text-muted mb-1.5">
                Aria understood {demo && <span className="text-text-subtle">· demo</span>}
              </div>
              {chips.length === 0 ? (
                <p className="text-xs text-text-muted">
                  Aria couldn't pull structured filters out — try mentioning gender, age, language, or skills.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((c) => (
                    <span key={c} className="h-7 px-2.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-[11px] inline-flex items-center">
                      {c}
                    </span>
                  ))}
                </div>
              )}
              {parsed.notes && (
                <p className="text-[10px] text-text-subtle mt-2 italic">
                  Note: {parsed.notes}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={apply}
                  disabled={chips.length === 0}
                  className={cn(
                    "flex-1 h-9 rounded-full text-xs font-semibold",
                    chips.length === 0 ? "bg-bg-muted text-text-subtle" : "bg-gold text-bg",
                  )}
                >
                  Apply filters
                </button>
                <button
                  onClick={onOpenManual}
                  className="h-9 px-3 rounded-full bg-bg-elevated border border-border text-[11px] text-text-muted"
                >
                  Edit manually
                </button>
                <button
                  onClick={() => setParsed(null)}
                  className="h-9 px-3 rounded-full bg-bg-elevated border border-border text-[11px] text-text-muted"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function collectChips(p: ParsedFilters): string[] {
  const out: string[] = [];
  p.gender?.forEach((g) => out.push(g));
  if (p.ageRange) out.push(`${p.ageRange[0]}–${p.ageRange[1]} yrs`);
  if (p.heightRange) out.push(`${p.heightRange[0]}–${p.heightRange[1]} cm`);
  p.ethnicities?.forEach((e) => out.push(e));
  p.bodyTypes?.forEach((b) => out.push(b));
  p.hairLengths?.forEach((h) => out.push(`${h} hair`));
  p.languages?.forEach((l) => out.push(l));
  p.accents?.forEach((a) => out.push(`${a} accent`));
  p.voiceTypes?.forEach((v) => out.push(v));
  p.skills?.forEach((s) => out.push(s));
  p.unionStatus?.forEach((u) => out.push(u));
  p.experienceLevels?.forEach((e) => out.push(e));
  p.locations?.forEach((l) => out.push(l));
  return out;
}
