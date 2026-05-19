"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Send, Wand2, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { TALENTS } from "@/lib/mock-data";
import { matchTalent } from "@/lib/matching";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

const EXAMPLES = [
  "Female lead, 25-35, fluent Hebrew + English, dramatic range, Tel Aviv area",
  "Athletic male, 22-30, surfing or skateboarding skills, energetic on-camera",
  "Older character actor with British RP accent, available for 6-week shoot",
];

export default function SourcingPage() {
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ summary: string; filters: any } | null>(null);

  async function analyze() {
    if (!brief.trim() || loading) return;
    setLoading(true);
    setResult(null);
    haptic("medium");

    // Quick local NLP — extracts obvious tokens. In real version we'd call /api/aria with a tool.
    const lower = brief.toLowerCase();
    const filters: any = {};

    // Gender
    if (/\bfemale|woman|girl|actress\b/.test(lower)) filters.gender = ["Female"];
    else if (/\bmale|man|boy|actor\b/.test(lower) && !/female/.test(lower)) filters.gender = ["Male"];

    // Age range
    const ageMatch = brief.match(/(\d{2})\s*[-–to]+\s*(\d{2})/);
    if (ageMatch) filters.ageRange = [+ageMatch[1], +ageMatch[2]];

    // Languages
    const langs: string[] = [];
    ["Hebrew", "English", "French", "German", "Russian", "Spanish", "Arabic"].forEach((l) => {
      if (lower.includes(l.toLowerCase())) langs.push(l);
    });
    if (langs.length) filters.languages = langs;

    // Skills
    const skills: string[] = [];
    ["surfing", "skateboarding", "boxing", "krav maga", "horseback riding", "guitar", "piano", "improv", "dialects", "yoga", "method acting"].forEach((s) => {
      if (lower.includes(s)) skills.push(s.charAt(0).toUpperCase() + s.slice(1));
    });
    if (skills.length) filters.skills = skills;

    // Body
    const body: string[] = [];
    ["Slim", "Athletic", "Average", "Curvy", "Muscular"].forEach((b) => {
      if (lower.includes(b.toLowerCase())) body.push(b);
    });
    if (body.length) filters.bodyTypes = body;

    // Accent
    const accents: string[] = [];
    ["British RP", "American Standard", "Russian", "German", "Arabic"].forEach((a) => {
      if (lower.includes(a.toLowerCase()) || lower.includes(a.split(" ")[0].toLowerCase())) accents.push(a);
    });
    if (accents.length) filters.accents = accents;

    // Location
    ["Tel Aviv", "Jerusalem", "Haifa", "Eilat", "Berlin", "London"].forEach((loc) => {
      if (lower.includes(loc.toLowerCase())) {
        filters.locations = [...(filters.locations || []), loc];
      }
    });

    // Simulate AI parse time
    await new Promise((r) => setTimeout(r, 900));

    const summary = `Identified ${Object.keys(filters).length} filter dimension${Object.keys(filters).length === 1 ? "" : "s"} from your brief.`;
    setResult({ summary, filters });
    setLoading(false);
  }

  const matches = result
    ? TALENTS
        .map((t) => ({ t, m: matchTalent(t, result.filters) }))
        .filter((r) => r.m.passes && r.m.score >= 40)
        .sort((a, b) => b.m.score - a.m.score)
    : [];

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header back title="AI Sourcing" right={<Wand2 className="w-4 h-4 text-gold" />} />

      <div className="px-5 pt-3 space-y-5">
        <div>
          <h1 className="font-display text-3xl tracking-editorial">
            Describe the role. <em className="text-gold-gradient not-italic">Aria finds them.</em>
          </h1>
          <p className="text-text-muted text-sm mt-1.5 leading-relaxed">
            Skip the filter panel. Type a casting brief in plain English — Aria translates it into typecast filters and ranks the entire roster.
          </p>
        </div>

        <div className="rounded-2xl bg-bg-elevated border border-border p-4">
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="e.g. Female lead 25-35, fluent Hebrew and English, dramatic range, willing to travel to Sofia for 6 weeks…"
            rows={5}
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-subtle resize-none"
          />
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-[10px] text-text-subtle">{brief.length} chars</span>
            <button
              onClick={analyze}
              disabled={!brief.trim() || loading}
              className="h-9 px-4 rounded-full bg-gold text-bg text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {loading ? "Analyzing…" : "Find talent"}
            </button>
          </div>
        </div>

        {!result && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2 px-1">Try one of these</div>
            <div className="space-y-2">
              {EXAMPLES.map((e) => (
                <button
                  key={e}
                  onClick={() => setBrief(e)}
                  className="w-full text-left p-3 rounded-xl bg-bg-elevated border border-border text-[12px] text-text-muted hover:text-text hover:border-gold/30"
                >
                  "{e}"
                </button>
              ))}
            </div>
          </div>
        )}

        {result && (
          <>
            <div className="rounded-2xl bg-gold/10 border border-gold/30 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
                <span className="text-[10px] uppercase tracking-widest text-gold font-semibold">Aria's read</span>
              </div>
              <p className="text-[12px] text-text leading-relaxed">{result.summary}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.entries(result.filters).map(([k, v]) => (
                  <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-bg border border-border text-text-muted">
                    {k}: {Array.isArray(v) ? v.join(", ") : String(v)}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="text-[10px] uppercase tracking-widest text-text-muted">Top ranked</div>
                <span className="text-[10px] text-gold tnum font-semibold">{matches.length} talents</span>
              </div>

              <div className="space-y-2">
                {matches.map(({ t, m }, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link
                      href={`/profile/${t.username}`}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-bg-elevated border border-border hover:border-gold/30"
                    >
                      <img src={t.photo} alt="" className="w-12 h-12 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm truncate">{t.name}</span>
                          {t.verified && <VerifiedBadge />}
                        </div>
                        <div className="text-[10px] text-text-muted truncate">
                          {t.typecast.gender} · {t.typecast.ageRange[0]}–{t.typecast.ageRange[1]} · {t.typecast.location}
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] tnum font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                        m.score >= 85 ? "bg-success/15 text-success" : "bg-gold/15 text-gold"
                      )}>
                        {m.score}%
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
