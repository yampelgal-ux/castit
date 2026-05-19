"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, Megaphone, Check, Sparkles, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { getAudition } from "@/lib/auditions-store";
import { TALENTS, type Audition, type Talent } from "@/lib/mock-data";
import { matchTalent } from "@/lib/matching";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export default function BroadcastPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [audition, setAudition] = useState<Audition | undefined>();
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState(false);
  const [minScore, setMinScore] = useState(60);

  useEffect(() => {
    const a = getAudition(id);
    if (!a) return;
    setAudition(a);
    setMessage(
      `Hi — we're casting "${a.title}" with ${a.studio}. Your profile fits exactly what we're looking for. Would love to see a self-tape by ${a.deadline}.`
    );
  }, [id]);

  const matches = useMemo(() => {
    if (!audition) return [];
    return TALENTS
      .map((t) => ({ t, m: matchTalent(t, audition.targetTypecast) }))
      .filter((r) => r.m.passes && r.m.score >= minScore)
      .sort((a, b) => b.m.score - a.m.score);
  }, [audition, minScore]);

  // Auto-select all on first match update
  useEffect(() => {
    setSelected(new Set(matches.map((r) => r.t.id)));
  }, [matches.length]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    haptic("light");
  }

  if (sent) {
    return (
      <div className="min-h-dvh bg-bg grid place-items-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-gold/20 grid place-items-center mx-auto mb-5">
            <Megaphone className="w-10 h-10 text-gold" />
          </div>
          <h1 className="font-display text-3xl tracking-editorial">Broadcast sent</h1>
          <p className="text-text-muted text-sm mt-2 leading-relaxed">
            {selected.size} matched talents just received a direct invite. Replies will land in your messages.
          </p>
          <button
            onClick={() => router.push(`/pro/audition/${id}`)}
            className="mt-7 w-full h-12 rounded-full bg-gold text-bg font-semibold"
          >
            Back to audition
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg pb-32">
      <Header back title="Broadcast invite" right={<Megaphone className="w-4 h-4 text-gold" />} />

      <div className="px-5 pt-3 space-y-5">
        <div>
          <h1 className="font-display text-3xl tracking-editorial">
            Invite the <em className="text-gold-gradient not-italic">best fits</em>.
          </h1>
          <p className="text-text-muted text-sm mt-1.5">
            One tap sends a personal invite straight to every matched profile's inbox.
          </p>
        </div>

        {/* Quality threshold */}
        <div className="rounded-2xl bg-bg-elevated border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] text-text-muted">Minimum match quality</div>
            <span className="text-[11px] tnum text-gold font-semibold">{minScore}%+</span>
          </div>
          <input
            type="range"
            min={30} max={95} step={5}
            value={minScore}
            onChange={(e) => setMinScore(+e.target.value)}
            className="w-full accent-gold"
          />
          <div className="flex items-center justify-between mt-2 text-[10px] text-text-subtle">
            <span>Wider reach</span>
            <span>Premium matches</span>
          </div>
        </div>

        {/* Message editor */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2 px-1">Your message</div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full p-3.5 rounded-2xl bg-bg-elevated border border-border text-sm outline-none focus:border-gold/40 resize-none"
          />
          <button
            onClick={() => {
              if (!audition) return;
              setMessage(`Hi {name} — your reels caught our eye for "${audition.title}". Your typecast fits perfectly. Self-tape due ${audition.deadline}. ${audition.fee ? `Fee: ${audition.fee}.` : ""}`);
              haptic("light");
            }}
            className="mt-2 text-[11px] text-gold font-semibold inline-flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" /> Personalize with Aria
          </button>
        </div>

        {/* Match list with checkboxes */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-text-muted">Recipients</div>
              <div className="text-[13px] tnum">
                <span className="font-semibold text-gold">{selected.size}</span>
                <span className="text-text-muted"> of {matches.length} matched</span>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setSelected(new Set(matches.map((r) => r.t.id)))}
                className="text-[10px] px-2 py-1 rounded-full bg-bg-elevated border border-border"
              >
                Select all
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-[10px] px-2 py-1 rounded-full bg-bg-elevated border border-border"
              >
                Clear
              </button>
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="text-center py-10 px-6 rounded-2xl bg-bg-elevated border border-border">
              <Users className="w-8 h-8 text-text-subtle mx-auto opacity-50" />
              <p className="text-sm mt-3">No talents above {minScore}% match.</p>
              <p className="text-[11px] text-text-muted mt-1">Lower the threshold above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {matches.map(({ t, m }, i) => (
                <Row
                  key={t.id}
                  t={t}
                  score={m.score}
                  selected={selected.has(t.id)}
                  onToggle={() => toggle(t.id)}
                  delay={i * 0.02}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 max-w-[440px] mx-auto p-4 border-t border-border bg-bg/95 backdrop-blur">
        <button
          onClick={() => { haptic("success"); setSent(true); }}
          disabled={selected.size === 0 || !message.trim()}
          className="w-full h-12 rounded-full bg-gold text-bg font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Send className="w-4 h-4" /> Send to {selected.size} talent{selected.size === 1 ? "" : "s"}
        </button>
      </div>
    </div>
  );
}

function Row({ t, score, selected, onToggle, delay }: { t: Talent; score: number; selected: boolean; onToggle: () => void; delay: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-2xl border transition-all",
        selected ? "border-gold bg-gold/8" : "border-border bg-bg-elevated"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded-md border-2 grid place-items-center shrink-0",
        selected ? "bg-gold border-gold" : "border-border-strong"
      )}>
        {selected && <Check className="w-3 h-3 text-bg" strokeWidth={3} />}
      </div>
      <img src={t.photo} alt="" className="w-10 h-10 rounded-xl object-cover" />
      <div className="flex-1 min-w-0 text-left">
        <div className="text-sm font-semibold truncate">{t.name}</div>
        <div className="text-[10px] text-text-muted truncate">
          {t.typecast.gender} · {t.typecast.ageRange[0]}–{t.typecast.ageRange[1]} · {t.typecast.location}
        </div>
      </div>
      <span className={cn(
        "text-[10px] tnum font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
        score >= 85 ? "bg-success/15 text-success" : "bg-gold/15 text-gold"
      )}>
        {score}%
      </span>
    </motion.button>
  );
}
