"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Clock, DollarSign, Calendar, Users, MessageCircle, Share2, Megaphone, Rocket, Send, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { getAudition } from "@/lib/auditions-store";
import { TALENTS, type Audition } from "@/lib/mock-data";
import { matchTalent } from "@/lib/matching";
import { cn } from "@/lib/utils";

export default function AuditionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [a, setA] = useState<Audition | null>(null);

  useEffect(() => { setA(getAudition(id) ?? null); }, [id]);

  if (!a) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="Audition" />
        <EmptyState icon={Megaphone} title="Not found" description="This audition may have been removed." />
      </div>
    );
  }

  // Show all talents (including non-passing) for completeness, but sort by match
  const ranked = TALENTS
    .map((t) => ({ t, m: matchTalent(t, a.targetTypecast) }))
    .sort((x, y) => Number(y.m.passes) - Number(x.m.passes) || y.m.score - x.m.score);

  const passing = ranked.filter((r) => r.m.passes);

  return (
    <div className="min-h-dvh bg-bg pb-8">
      <Header back title={a.title} />

      <div className="px-5 pt-3 space-y-5">
        {/* Brief */}
        <div className="rounded-2xl bg-bg-elevated border border-border p-4">
          <div className="text-[10px] uppercase tracking-widest text-gold">{a.type}</div>
          <h2 className="font-display text-2xl tracking-editorial mt-0.5">{a.title}</h2>
          <p className="text-[11px] text-text-muted mt-1">{a.studio}</p>

          <div className="flex flex-wrap gap-3 text-[11px] text-text-muted mt-3">
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.location}</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> by {a.deadline}</span>
            {a.shootDates && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {a.shootDates}</span>}
            {a.paid && <span className="inline-flex items-center gap-1 text-success font-semibold"><DollarSign className="w-3 h-3" /> {a.fee || "Paid"}</span>}
          </div>

          <p className="text-sm mt-3 leading-relaxed">{a.description}</p>

          {a.selfTapeInstructions && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-[10px] uppercase tracking-widest text-gold mb-1">Self-tape</div>
              <p className="text-xs leading-relaxed">{a.selfTapeInstructions}</p>
            </div>
          )}
        </div>

        {/* Pro exposure actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href={`/pro/audition/${a.id}/boost`}
            className="rounded-2xl p-3.5 bg-gradient-to-br from-gold/20 to-bg-elevated border border-gold/40 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gold/25 grid place-items-center mb-2">
              <Rocket className="w-4 h-4 text-gold" />
            </div>
            <div className="text-sm font-semibold">Boost</div>
            <div className="text-[10px] text-text-muted mt-0.5">Reach 24K+ talents fast</div>
          </Link>
          <Link
            href={`/pro/audition/${a.id}/broadcast`}
            className="rounded-2xl p-3.5 bg-gradient-to-br from-plum/20 to-bg-elevated border border-plum-light/30"
          >
            <div className="w-9 h-9 rounded-xl bg-plum/30 grid place-items-center mb-2">
              <Send className="w-4 h-4 text-plum-light" />
            </div>
            <div className="text-sm font-semibold">Broadcast invite</div>
            <div className="text-[10px] text-text-muted mt-0.5">DM the {passing.length} best fits</div>
          </Link>
        </div>

        {/* Target criteria summary */}
        {Object.values(a.targetTypecast).some((v) => v && (Array.isArray(v) ? v.length : true)) && (
          <div className="rounded-2xl bg-plum/10 border border-plum-light/20 p-4">
            <div className="text-[10px] uppercase tracking-widest text-plum-light font-semibold mb-2">Target typecast</div>
            <div className="flex flex-wrap gap-1.5">
              {a.targetTypecast.gender?.map((g) => <Tag key={g}>{g}</Tag>)}
              {a.targetTypecast.ageRange && <Tag>{a.targetTypecast.ageRange[0]}–{a.targetTypecast.ageRange[1]} yrs</Tag>}
              {a.targetTypecast.heightRange && <Tag>{a.targetTypecast.heightRange[0]}–{a.targetTypecast.heightRange[1]} cm</Tag>}
              {a.targetTypecast.bodyTypes?.map((b) => <Tag key={b}>{b}</Tag>)}
              {a.targetTypecast.languages?.map((l) => <Tag key={l}>{l}</Tag>)}
              {a.targetTypecast.accents?.map((a) => <Tag key={a}>{a}</Tag>)}
              {a.targetTypecast.voiceTypes?.map((v) => <Tag key={v}>{v}</Tag>)}
              {a.targetTypecast.skills?.map((s) => <Tag key={s}>{s}</Tag>)}
              {a.targetTypecast.unionStatus?.map((u) => <Tag key={u}>{u}</Tag>)}
              {a.targetTypecast.experienceLevels?.map((e) => <Tag key={e}>{e}</Tag>)}
              {a.targetTypecast.mustTravel && <Tag>Travel-ready</Tag>}
            </div>
          </div>
        )}

        {/* Matches */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs uppercase tracking-widest text-text-muted">
              Matching talent <span className="text-text font-semibold tnum">({passing.length})</span>
            </h3>
            <Link href="/pro/search" className="text-[11px] text-gold font-semibold">All talent →</Link>
          </div>

          <div className="space-y-2.5">
            {passing.slice(0, 20).map(({ t, m }, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl bg-bg-elevated border border-border overflow-hidden"
              >
                <Link href={`/profile/${t.username}`} className="flex items-center gap-3 p-3">
                  <img src={t.photo} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{t.name}</span>
                      <span className={cn(
                        "text-[10px] tnum font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap",
                        m.score >= 85 ? "bg-success/15 text-success border-success/30"
                          : m.score >= 65 ? "bg-gold/15 text-gold border-gold/30"
                          : "bg-bg text-text-muted border-border"
                      )}>{m.score}% match</span>
                    </div>
                    <p className="text-[11px] text-text-muted truncate mt-0.5">
                      {t.typecast.gender} · {t.typecast.ageRange[0]}–{t.typecast.ageRange[1]} · {t.typecast.heightCm}cm · {t.typecast.location}
                    </p>
                  </div>
                  <Link
                    href={`/messages?with=${t.id}&name=${encodeURIComponent(t.name)}`}
                    className="h-8 px-3 rounded-full bg-gold text-bg text-[11px] font-semibold inline-flex items-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3" /> Invite
                  </Link>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] px-2 py-1 rounded-full bg-bg-elevated border border-border text-text-muted">
      {children}
    </span>
  );
}
