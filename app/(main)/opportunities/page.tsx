"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import Link from "next/link";
import { Clock, Trophy, Flame, MapPin, TrendingUp, Award, X, Check, Send, Sparkles, DollarSign, Megaphone, ChevronRight, Newspaper } from "lucide-react";
import { DAILY_TASKS, CASTINGS, STARS_OF_WEEK, TALENTS, type Casting, type Talent, type Audition } from "@/lib/mock-data";
import { Header } from "@/components/Header";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { EmptyState } from "@/components/EmptyState";
import { useStore } from "@/lib/store";
import { applyToCasting } from "@/lib/db";
import { loadAuditions } from "@/lib/auditions-store";
import { matchTalent } from "@/lib/matching";
import { cn, formatNumber } from "@/lib/utils";

const TABS = ["Daily", "Auditions", "Castings", "Stars"] as const;

export default function OpportunitiesPage() {
  const [tab, setTab] = useState<typeof TABS[number]>("Daily");
  const streak = useStore((s) => s.streak);

  return (
    <div>
      <Header
        title={<span>For <em className="text-gold-gradient not-italic">You</em></span>}
        right={
          <button className="px-3 py-1.5 text-xs rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-semibold flex items-center gap-1.5">
            <Flame className="w-3 h-3" />
            {streak} day streak
          </button>
        }
      />

      <div className="px-4 pt-2">
        <div className="flex gap-1 p-1 rounded-2xl bg-bg-elevated border border-border">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 h-9 rounded-xl text-xs font-medium transition-all",
                tab === t ? "bg-gold text-bg" : "text-text-muted"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="px-4 pt-5 space-y-4 pb-10"
        >
          {tab === "Daily" && <DailyView />}
          {tab === "Auditions" && <AuditionsView />}
          {tab === "Castings" && <CastingsView />}
          {tab === "Stars" && <StarsView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DailyView() {
  const [dismissed, setDismissed] = useState(false);

  return (
    <>
      {/* This week in casting newsletter banner */}
      <AnimatePresence>
        {!dismissed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="rounded-2xl bg-bg-elevated border border-border overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet/20 grid place-items-center shrink-0">
                    <Newspaper className="w-4 h-4 text-violet" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-violet font-semibold">Weekly digest</div>
                    <div className="font-display text-base leading-tight">This week in casting</div>
                  </div>
                </div>
                <button
                  onClick={() => setDismissed(true)}
                  className="w-6 h-6 rounded-full bg-bg grid place-items-center text-text-muted shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {[
                  { icon: "🎬", text: "14 new feature film roles posted this week" },
                  { icon: "⭐", text: "2 talent from your region just got callbacks" },
                  { icon: "📈", text: "Drama roles up 32% — best week since January" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-text-muted">
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/opportunities"
                className="mt-3 flex items-center gap-1 text-xs text-gold font-semibold"
              >
                View all opportunities <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's challenge */}
      <div className="rounded-3xl p-5 bg-gradient-to-br from-gold/15 via-bg-elevated to-bg-elevated border border-gold/20 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gold/10 blur-2xl" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-widest text-gold mb-1">Today's challenge</div>
          <h3 className="font-display text-2xl leading-tight">{DAILY_TASKS[0].title}</h3>
          <p className="text-text-muted text-sm mt-1.5">{DAILY_TASKS[0].description}</p>
          <div className="flex items-center gap-3 mt-4 text-xs">
            <span className="inline-flex items-center gap-1 text-text-muted">
              <Clock className="w-3.5 h-3.5" /> {DAILY_TASKS[0].daysLeft} days left
            </span>
            <span className="inline-flex items-center gap-1 text-text-muted">
              <Flame className="w-3.5 h-3.5" /> {formatNumber(DAILY_TASKS[0].participants)} joined
            </span>
          </div>
          <button className="mt-4 h-11 px-5 rounded-full bg-gold text-bg text-sm font-semibold">
            Submit your take
          </button>
        </div>
      </div>

      <div className="text-xs uppercase tracking-wider text-text-muted px-1 pt-2">More this week</div>
      {DAILY_TASKS.slice(1).map((t) => (
        <div key={t.id} className="rounded-2xl p-4 bg-bg-elevated border border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-violet">{t.category}</div>
              <h4 className="font-display text-lg mt-0.5">{t.title}</h4>
              <p className="text-text-muted text-xs mt-1">{t.description}</p>
            </div>
            <span className="text-[10px] text-text-subtle whitespace-nowrap">{t.daysLeft}d left</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-[11px] text-text-muted inline-flex items-center gap-1">
              <Award className="w-3 h-3 text-gold" /> {t.reward}
            </span>
            <button className="text-xs font-semibold text-gold">Join →</button>
          </div>
        </div>
      ))}
    </>
  );
}

function CastingsView() {
  const [selected, setSelected] = useState<Casting | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const visible = CASTINGS.filter((c) => !skipped.has(c.id));

  return (
    <>
      <p className="text-[11px] text-text-muted px-1">
        Swipe right to apply · swipe left to skip
      </p>
      {visible.map((c) => (
        <SwipeCastingCard
          key={c.id}
          casting={c}
          onApply={() => setSelected(c)}
          onSkip={() => setSkipped((s) => new Set([...s, c.id]))}
        />
      ))}
      {visible.length === 0 && (
        <EmptyState
          icon={Megaphone}
          tone="gold"
          title="All caught up"
          description="You've reviewed all castings. Check back tomorrow for new roles."
          ctaLabel="View auditions"
          ctaHref="/opportunities"
        />
      )}
      {selected && (
        <ApplyModal casting={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function SwipeCastingCard({
  casting: c,
  onApply,
  onSkip,
}: {
  casting: Casting;
  onApply: () => void;
  onSkip: () => void;
}) {
  const applied = useStore((s) => s.appliedCastings.has(c.id));
  const x = useMotionValue(0);
  const applyOpacity = useTransform(x, [20, 80], [0, 1]);
  const skipOpacity = useTransform(x, [-80, -20], [1, 0]);
  const applyScale = useTransform(x, [0, 80], [0.8, 1]);
  const skipScale = useTransform(x, [-80, 0], [1, 0.8]);
  const bgGreen = useTransform(x, [0, 100], ["rgba(74,222,128,0)", "rgba(74,222,128,0.15)"]);
  const bgRed = useTransform(x, [-100, 0], ["rgba(239,68,68,0.15)", "rgba(239,68,68,0)"]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Swipe overlays */}
      <motion.div
        style={{ backgroundColor: bgGreen }}
        className="absolute inset-0 z-10 pointer-events-none rounded-2xl"
      />
      <motion.div
        style={{ backgroundColor: bgRed }}
        className="absolute inset-0 z-10 pointer-events-none rounded-2xl"
      />

      {/* Apply indicator */}
      <motion.div
        style={{ opacity: applyOpacity, scale: applyScale }}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success text-white text-xs font-bold"
      >
        <Check className="w-3.5 h-3.5" /> Apply
      </motion.div>

      {/* Skip indicator */}
      <motion.div
        style={{ opacity: skipOpacity, scale: skipScale }}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-danger text-white text-xs font-bold"
      >
        Skip <X className="w-3.5 h-3.5" />
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -160, right: 160 }}
        dragElastic={0.15}
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 90) onApply();
          else if (info.offset.x < -90) onSkip();
        }}
        className="relative z-0 cursor-grab active:cursor-grabbing"
      >
        <div className="rounded-2xl bg-bg-elevated border border-border overflow-hidden">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-bg shrink-0">
                <img src={c.studioLogo} alt={c.studio} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted truncate">{c.studio}</span>
                  {c.paid && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success font-semibold">PAID</span>
                  )}
                </div>
                <h4 className="font-display text-base leading-tight mt-0.5">{c.title}</h4>
                <div className="flex items-center gap-3 text-[11px] text-text-muted mt-1.5">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.location}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> by {c.deadline}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-text mt-3 leading-relaxed line-clamp-2">{c.description}</p>

            {(c.requirements.gender || c.requirements.languages || c.requirements.skills) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {c.requirements.gender?.map((g) => (
                  <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-bg border border-border text-text-muted">{g}</span>
                ))}
                {c.requirements.ageRange && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg border border-border text-text-muted">
                    {c.requirements.ageRange[0]}–{c.requirements.ageRange[1]} yrs
                  </span>
                )}
                {c.requirements.languages?.map((l) => (
                  <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-bg border border-border text-text-muted">{l}</span>
                ))}
                {c.requirements.skills?.map((s) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-violet/10 border border-violet/30 text-violet">{s}</span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg/40">
            <span className="text-[11px] text-text-muted tnum">{c.applicants} applied</span>
            {applied ? (
              <span className="h-9 px-4 rounded-full bg-success/15 text-success text-xs font-semibold inline-flex items-center gap-1">
                <Check className="w-3 h-3" /> Applied
              </span>
            ) : (
              <button
                onClick={onApply}
                className="h-9 px-4 rounded-full bg-gold text-bg text-xs font-semibold"
              >
                Apply
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AuditionsView() {
  const { profile, userId } = useStore();
  const [auditions, setAuditions] = useState<Audition[]>([]);
  useEffect(() => { setAuditions(loadAuditions()); }, []);

  const me: Talent = useMemo(() => ({
    id: userId ?? "me", username: profile.username || "you", name: profile.name || "You",
    verified: false, photo: "", cover: "", bio: "", followers: 0, likes: 0, submissions: 0,
    typecast: {
      heightCm: profile.typecast.heightCm ?? 175,
      weightKg: profile.typecast.weightKg ?? 65,
      ageRange: [profile.typecast.ageRangeMin ?? 22, profile.typecast.ageRangeMax ?? 35],
      gender: (profile.typecast.gender as any) ?? "Female",
      ethnicity: "",
      skinTone: profile.typecast.skinTone ?? "#EBC8A7",
      eyeColor: profile.typecast.eyeColor ?? "#6B8E4E",
      hairColor: profile.typecast.hairColor ?? "#3B2A1E",
      hairLength: (profile.typecast.hairLength as any) ?? "Medium",
      languages: profile.typecast.languages ?? ["English"],
      skills: profile.typecast.skills ?? [],
      genres: profile.typecast.genres ?? [],
      location: "Tel Aviv",
      willingToTravel: true,
    },
  }), [profile, userId]);

  const ranked = useMemo(() => (
    auditions
      .map((a) => ({ a, m: matchTalent(me, a.targetTypecast) }))
      .filter((r) => r.m.passes)
      .sort((x, y) => y.m.score - x.m.score)
  ), [auditions, me]);

  if (ranked.length === 0) {
    return (
      <EmptyState
        icon={Megaphone}
        tone="gold"
        title="No live auditions for you yet"
        description="Casting pros post here. Complete your typecast so you appear in their search."
        ctaLabel="Edit my typecast"
        ctaHref="/profile/me"
      />
    );
  }

  return (
    <>
      <div className="text-[11px] text-text-muted px-1 mb-1">Sorted by match to your typecast</div>
      {ranked.map(({ a, m }, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <Link href={`/auditions/${a.id}`} className="block rounded-2xl bg-bg-elevated border border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-gold">{a.type}</div>
                <h4 className="font-display text-lg leading-tight mt-0.5">{a.title}</h4>
                <p className="text-[11px] text-text-muted mt-0.5">{a.studio}</p>
              </div>
              {m.passes && (
                <span className={cn(
                  "text-[10px] tnum font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap",
                  m.score >= 85 ? "bg-success/15 text-success border-success/30"
                    : m.score >= 65 ? "bg-gold/15 text-gold border-gold/30"
                    : "bg-bg text-text-muted border-border"
                )}>
                  <Sparkles className="w-2.5 h-2.5 inline mr-0.5" /> {m.score}%
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-text-muted mt-3">
              <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.location}</span>
              <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> by {a.deadline}</span>
              {a.paid && (
                <span className="inline-flex items-center gap-1 text-success font-semibold">
                  <DollarSign className="w-3 h-3" /> {a.fee || "Paid"}
                </span>
              )}
            </div>
          </Link>
        </motion.div>
      ))}
    </>
  );
}

function ApplyModal({ casting, onClose }: { casting: Casting; onClose: () => void }) {
  const { userId, profile, markApplied } = useStore();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (loading) return;
    setLoading(true);
    if (userId) await applyToCasting(casting.id, userId, message);
    markApplied(casting.id);
    setDone(true);
    setLoading(false);
    setTimeout(onClose, 1400);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-[440px] bg-bg-elevated border border-border rounded-3xl p-6 space-y-4"
      >
        {done ? (
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="w-14 h-14 rounded-full bg-success/15 grid place-items-center">
              <Check className="w-7 h-7 text-success" strokeWidth={2.5} />
            </div>
            <p className="font-display text-xl">Application sent!</p>
            <p className="text-text-muted text-sm text-center">You'll hear back via Aria when there's news.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{casting.title}</p>
                <p className="text-text-muted text-xs">{casting.studio}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg grid place-items-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-text-muted uppercase tracking-wider">Cover note (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell them why you're a great fit…"
                rows={4}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-bg border border-border outline-none text-sm placeholder:text-text-subtle resize-none focus:border-gold/50 transition-colors"
              />
            </div>

            <div className="text-[11px] text-text-muted">
              Applying as <span className="text-text font-semibold">@{profile.username || "you"}</span>
            </div>

            <button
              onClick={submit}
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gold text-bg font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? "Sending…" : <>Submit Application <Send className="w-4 h-4" /></>}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

function StarsView() {
  const podium = STARS_OF_WEEK.slice(0, 3);
  const rest = STARS_OF_WEEK.slice(3);

  return (
    <>
      <div className="rounded-3xl p-5 bg-gradient-to-br from-violet/15 via-bg-elevated to-bg-elevated border border-violet/20">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-gold" />
          <span className="text-xs uppercase tracking-widest text-text-muted">This week</span>
        </div>
        <div className="flex items-end justify-center gap-3 mt-2 mb-1">
          {[1, 0, 2].map((idx) => {
            const star = podium[idx];
            const talent = TALENTS.find((t) => t.id === star.talentId)!;
            const heights = ["h-24", "h-32", "h-20"];
            const order = idx === 0 ? heights[1] : idx === 1 ? heights[0] : heights[2];
            return (
              <Link key={star.rank} href={`/profile/${talent.username}`} className="flex flex-col items-center flex-1">
                <div className="relative">
                  <img
                    src={talent.photo}
                    alt={talent.name}
                    className={cn("rounded-full object-cover border-2", idx === 0 ? "w-20 h-20 border-gold" : "w-14 h-14 border-border-strong")}
                  />
                  <div className={cn("absolute -top-1 -right-1 w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold", idx === 0 ? "bg-gold text-bg" : "bg-bg-elevated text-text border border-border")}>
                    {star.rank}
                  </div>
                </div>
                <div className={cn("mt-2 text-center", idx === 0 ? "" : "opacity-80")}>
                  <div className="text-xs font-semibold flex items-center gap-1 justify-center">
                    {talent.name.split(" ")[0]}
                    {talent.verified && <VerifiedBadge />}
                  </div>
                  <div className="text-[10px] text-text-muted tnum mt-0.5">{formatNumber(star.weeklyLikes)}</div>
                </div>
                <div className={cn("mt-2 w-full rounded-t-xl bg-gradient-to-t", order, idx === 0 ? "from-gold/40 to-gold/10" : "from-violet/30 to-violet/5")} />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="text-xs uppercase tracking-wider text-text-muted px-1 pt-2">Rising</div>
      {rest.map((star) => {
        const talent = TALENTS.find((t) => t.id === star.talentId)!;
        return (
          <Link href={`/profile/${talent.username}`} key={star.rank} className="flex items-center gap-3 p-3 rounded-2xl bg-bg-elevated border border-border">
            <span className="w-6 text-center text-sm font-display text-text-muted tnum">{star.rank}</span>
            <img src={talent.photo} alt={talent.name} className="w-12 h-12 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm truncate">{talent.name}</span>
                {talent.verified && <VerifiedBadge />}
              </div>
              <div className="text-[11px] text-text-muted">{star.category}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold tnum">{formatNumber(star.weeklyLikes)}</div>
              <div className="text-[10px] text-success inline-flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" /> +{star.growth}%
              </div>
            </div>
          </Link>
        );
      })}
    </>
  );
}
