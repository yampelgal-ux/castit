"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, MessageCircle, Megaphone, Sparkles, Info, Ruler, Languages, Check, X, Filter,
} from "lucide-react";
import { Header } from "@/components/Header";
import { TypecastBadge } from "@/components/TypecastBadge";
import { type Talent, type ReelPost } from "@/lib/mock-data";
import { useAllReels } from "@/lib/cloud/talents";
import { loadAuditions } from "@/lib/auditions-store";
import { matchTalent } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { ReelCard } from "@/components/reels/ReelCard";
import { SendAuditionSheet } from "@/components/SendAuditionSheet";
import { haptic } from "@/lib/haptics";
import { cn, formatNumber } from "@/lib/utils";

type Tab = "All" | "Matches";

export default function ProReelsPage() {
  const { profile } = useStore();
  const [tab, setTab] = useState<Tab>("All");
  const [auditionId, setAuditionId] = useState<string | null>(null);
  const { reels: REELS, talents: TALENTS } = useAllReels();
  const auditions = useMemo(() => (typeof window !== "undefined" ? loadAuditions() : []), []);

  // Default the "Matches" filter to the most recent audition
  useEffect(() => {
    if (auditions.length && !auditionId) setAuditionId(auditions[0].id);
  }, [auditions, auditionId]);

  const target = useMemo(() => {
    const a = auditions.find((x) => x.id === auditionId);
    return a?.targetTypecast ?? null;
  }, [auditions, auditionId]);

  const feed = useMemo(() => {
    let items = REELS.map((r) => {
      const talent = TALENTS.find((t) => t.id === r.talentId);
      if (!talent) return null;
      const m = target ? matchTalent(talent, target) : null;
      return { reel: r, talent, match: m };
    }).filter(Boolean) as { reel: ReelPost; talent: Talent; match: ReturnType<typeof matchTalent> | null }[];

    if (tab === "Matches" && target) {
      items = items.filter((x) => x.match!.passes && x.match!.score >= 40);
      items.sort((a, b) => b.match!.score - a.match!.score);
    }
    return items;
  }, [REELS, TALENTS, tab, target]);

  return (
    <div className="relative -mb-20"> {/* compensate parent layout pb-20 */}
      {/* Header overlay (transparent so video shows under) */}
      <div className="fixed top-0 inset-x-0 z-30 max-w-[440px] mx-auto px-5 pt-4 pb-3 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[0.6875rem] px-1.5 py-0.5 rounded-full bg-plum/30 text-plum-light font-semibold tracking-wider">PRO</span>
            <span className="font-display text-base text-white">Discover</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => setTab("All")}
              className={cn(
                "relative pb-1 transition-colors",
                tab === "All" ? "text-white font-semibold" : "text-white/60"
              )}
            >
              All
              {tab === "All" && <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold rounded-full" />}
            </button>
            <button
              onClick={() => setTab("Matches")}
              className={cn(
                "relative pb-1 transition-colors inline-flex items-center gap-1",
                tab === "Matches" ? "text-white font-semibold" : "text-white/60"
              )}
            >
              <Sparkles className="w-3 h-3" /> Matches
              {tab === "Matches" && <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold rounded-full" />}
            </button>
          </div>
        </div>

        {/* Audition selector for "Matches" tab */}
        {tab === "Matches" && auditions.length > 0 && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <Filter className="w-3 h-3 text-white/60 shrink-0" />
            {auditions.map((a) => (
              <button
                key={a.id}
                onClick={() => setAuditionId(a.id)}
                className={cn(
                  "shrink-0 h-7 px-3 rounded-full text-[0.6875rem] border whitespace-nowrap",
                  auditionId === a.id
                    ? "bg-gold text-on-accent border-gold"
                    : "bg-white/10 text-white/80 border-white/20"
                )}
              >
                {a.title.length > 28 ? a.title.slice(0, 28) + "…" : a.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="snap-feed no-scrollbar bg-black">
        {feed.length === 0 ? (
          <div className="h-dvh flex flex-col items-center justify-center text-center px-6 text-white/70">
            <Sparkles className="w-10 h-10 text-gold mb-3" />
            <p className="font-display text-xl text-white">No matches for this audition</p>
            <p className="text-sm mt-1.5 max-w-xs">Try a less restrictive brief — or switch to <span className="text-gold">All</span>.</p>
          </div>
        ) : (
          feed.map(({ reel, talent, match }) => (
            <ProReelView
              key={reel.id}
              reel={reel}
              talent={talent}
              match={match}
              auditions={auditions}
              defaultAuditionId={auditionId}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ProReelView({
  reel, talent, match, auditions, defaultAuditionId,
}: {
  reel: ReelPost;
  talent: Talent;
  match: ReturnType<typeof matchTalent> | null;
  auditions: ReturnType<typeof loadAuditions>;
  defaultAuditionId: string | null;
}) {
  const { shortlist, toggleShortlist } = useStore();
  const [showInfo, setShowInfo] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const isShortlisted = shortlist.has(talent.id);

  const Extra = ({ label, onClick, children, gold }: { label: string; onClick: () => void; children: React.ReactNode; gold?: boolean }) => (
    <button onClick={onClick} aria-label={label} className="flex flex-col items-center gap-1 text-white">
      <span className={cn("w-12 h-12 rounded-full grid place-items-center", gold ? "bg-hi text-on-hi" : "bg-black/25 backdrop-blur-sm")}>{children}</span>
      <span className="text-xs font-semibold drop-shadow">{label}</span>
    </button>
  );

  return (
    <>
      <ReelCard
        reel={reel}
        talent={talent}
        badge={match && match.passes ? (
          <span className={cn(
            "px-2.5 py-1 rounded-full backdrop-blur-md text-xs font-semibold border inline-flex items-center gap-1 tnum text-white",
            match.score >= 85 ? "bg-success/30 border-success/60" : match.score >= 65 ? "bg-hi/30 border-hi/60" : "bg-white/15 border-white/30"
          )}>
            <Sparkles className="w-3 h-3" /> {match.score}% match
          </span>
        ) : undefined}
        railExtra={
          <>
            <Extra label={isShortlisted ? "Saved" : "Shortlist"} gold={isShortlisted}
              onClick={() => { toggleShortlist(talent.id); haptic(isShortlisted ? "light" : "success"); }}>
              <Star className={cn("w-5 h-5", isShortlisted && "fill-current")} />
            </Extra>
            <Extra label="Typecast" onClick={() => setShowInfo(true)}>
              <Info className="w-5 h-5" />
            </Extra>
          </>
        }
        cta={
          <div className="flex gap-2">
            <button onClick={() => { setShowInvite(true); haptic("medium"); }}
              className="h-11 px-5 rounded-full bg-hi text-on-hi text-sm font-bold inline-flex items-center gap-2 shadow-lg">
              <Megaphone className="w-4 h-4" /> Invite to audition
            </button>
            <Link href={`/messages?with=${talent.id}&name=${encodeURIComponent(talent.name)}`}
              className="h-11 px-4 rounded-full bg-white/15 backdrop-blur border border-white/25 text-white text-sm font-semibold inline-flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Message
            </Link>
          </div>
        }
      />
      <AnimatePresence>
        {showInfo && <TypecastSheet talent={talent} onClose={() => setShowInfo(false)} />}
      </AnimatePresence>
      <SendAuditionSheet open={showInvite} onClose={() => setShowInvite(false)} talent={talent} />
    </>
  );
}

function TypecastSheet({ talent, onClose }: { talent: Talent; onClose: () => void }) {
  const tc = talent.typecast;
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-40" onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed bottom-0 inset-x-0 max-w-[440px] mx-auto z-50 bg-bg-elevated border-t border-border rounded-t-3xl max-h-[80dvh] overflow-y-auto"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src={talent.photo} alt={talent.name} className="w-12 h-12 rounded-full object-cover" />
              <div>
                <div className="font-display text-lg leading-tight">{talent.name}</div>
                <div className="text-[0.6875rem] text-text-muted">@{talent.username}</div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-bg-muted grid place-items-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5">
            <Stat label="Gender" value={tc.gender} />
            <Stat label="Age range" value={`${tc.ageRange[0]}–${tc.ageRange[1]}`} />
            <Stat label="Height" value={`${tc.heightCm} cm`} />
            <Stat label="Weight" value={`${tc.weightKg} kg`} />
            {tc.bodyType && <Stat label="Body" value={tc.bodyType} />}
            {tc.ethnicity && <Stat label="Ethnicity" value={tc.ethnicity} />}
            {tc.voiceType && <Stat label="Voice" value={tc.voiceType} />}
            {tc.experienceLevel && <Stat label="Experience" value={tc.experienceLevel} />}
            {tc.unionStatus && <Stat label="Union" value={tc.unionStatus} />}
            {tc.location && <Stat label="Based in" value={tc.location} />}
            <ColorStat label="Skin" color={tc.skinTone} />
            <ColorStat label="Eyes" color={tc.eyeColor} />
            <ColorStat label="Hair" color={tc.hairColor} />
            <Stat label="Hair length" value={tc.hairLength} />
          </div>

          <Group label="Languages">
            {tc.languages.map((l) => <TypecastBadge key={l}>{l}</TypecastBadge>)}
          </Group>
          {tc.accents?.length ? (
            <Group label="Accents">{tc.accents.map((a) => <TypecastBadge key={a}>{a}</TypecastBadge>)}</Group>
          ) : null}
          {tc.skills.length ? (
            <Group label="Skills">{tc.skills.map((s) => <TypecastBadge key={s}>{s}</TypecastBadge>)}</Group>
          ) : null}
          {tc.features?.length ? (
            <Group label="Features">{tc.features.map((f) => <TypecastBadge key={f}>{f}</TypecastBadge>)}</Group>
          ) : null}

          <div className="grid grid-cols-2 gap-2 mt-5">
            <Link
              href={`/profile/${talent.username}`}
              className="h-11 rounded-xl bg-bg-elevated border border-border text-sm font-semibold inline-flex items-center justify-center"
            >
              Full profile
            </Link>
            <Link
              href={`/messages?with=${talent.id}&name=${encodeURIComponent(talent.name)}`}
              className="h-11 rounded-xl bg-gold text-on-accent text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" /> Message
            </Link>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function Stat({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[0.6875rem] uppercase tracking-widest text-text-muted">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}

function ColorStat({ label, color }: { label: string; color: string }) {
  return (
    <div>
      <div className="text-[0.6875rem] uppercase tracking-widest text-text-muted">{label}</div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="w-5 h-5 rounded-full border border-border" style={{ background: color }} />
        <span className="text-[0.6875rem] font-mono text-text-muted">{color}</span>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-[0.6875rem] uppercase tracking-widest text-text-muted mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
