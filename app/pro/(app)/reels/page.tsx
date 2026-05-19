"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark, MessageCircle, Megaphone, Sparkles, Info, Ruler, Languages, Check, X, Filter,
} from "lucide-react";
import { Header } from "@/components/Header";
import { LazyVideo } from "@/components/LazyVideo";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { TypecastBadge } from "@/components/TypecastBadge";
import { REELS, TALENTS, type Talent, type ReelPost } from "@/lib/mock-data";
import { loadAuditions } from "@/lib/auditions-store";
import { matchTalent } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { haptic } from "@/lib/haptics";
import { cn, formatNumber } from "@/lib/utils";

type Tab = "All" | "Matches";

export default function ProReelsPage() {
  const { profile } = useStore();
  const [tab, setTab] = useState<Tab>("All");
  const [auditionId, setAuditionId] = useState<string | null>(null);
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
  }, [tab, target]);

  return (
    <div className="relative -mb-20"> {/* compensate parent layout pb-20 */}
      {/* Header overlay (transparent so video shows under) */}
      <div className="fixed top-0 inset-x-0 z-30 max-w-[440px] mx-auto px-5 pt-4 pb-3 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-plum/30 text-plum-light font-semibold tracking-wider">PRO</span>
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
                  "shrink-0 h-7 px-3 rounded-full text-[11px] border whitespace-nowrap",
                  auditionId === a.id
                    ? "bg-gold text-bg border-gold"
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

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <LazyVideo
        src={reel.videoUrl}
        poster={reel.poster}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40 pointer-events-none" />

      {/* Top-right match badge (pro-only) */}
      {match && match.passes && (
        <div className="absolute top-20 right-4 z-10">
          <div className={cn(
            "px-2.5 py-1 rounded-full backdrop-blur-md text-[11px] font-semibold border inline-flex items-center gap-1 tnum",
            match.score >= 85 ? "bg-success/30 text-white border-success/60"
              : match.score >= 65 ? "bg-gold/30 text-white border-gold/60"
              : "bg-white/15 text-white border-white/30"
          )}>
            <Sparkles className="w-3 h-3" /> {match.score}% match
          </div>
        </div>
      )}

      {/* Right rail — pro actions */}
      <div className="absolute right-3 bottom-32 z-10 flex flex-col items-center gap-4">
        <Link href={`/profile/${talent.username}`} className="flex flex-col items-center gap-1">
          <img src={talent.photo} alt={talent.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white/80" />
          <span className="text-[10px] text-white/90 font-medium">View</span>
        </Link>

        <button
          onClick={() => { toggleShortlist(talent.id); haptic(isShortlisted ? "light" : "success"); }}
          className="flex flex-col items-center gap-1 text-white"
          aria-label={isShortlisted ? "Remove from shortlist" : "Shortlist"}
        >
          <div className={cn(
            "w-12 h-12 rounded-full grid place-items-center transition-colors",
            isShortlisted ? "bg-gold text-bg" : "bg-white/15 backdrop-blur text-white"
          )}>
            <Bookmark className={cn("w-5 h-5", isShortlisted && "fill-current")} />
          </div>
          <span className="text-[10px] font-medium">{isShortlisted ? "Saved" : "Shortlist"}</span>
        </button>

        <button
          onClick={() => { setShowInvite(true); haptic("medium"); }}
          className="flex flex-col items-center gap-1 text-white"
          aria-label="Invite to audition"
        >
          <div className="w-12 h-12 rounded-full bg-gold text-bg grid place-items-center">
            <Megaphone className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium">Invite</span>
        </button>

        <Link
          href={`/messages?with=${talent.id}&name=${encodeURIComponent(talent.name)}`}
          className="flex flex-col items-center gap-1 text-white"
          onClick={() => haptic("light")}
        >
          <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur grid place-items-center">
            <MessageCircle className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium">Message</span>
        </Link>

        <button
          onClick={() => setShowInfo(true)}
          className="flex flex-col items-center gap-1 text-white"
          aria-label="Typecast details"
        >
          <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur grid place-items-center">
            <Info className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium">Typecast</span>
        </button>
      </div>

      {/* Bottom info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute left-4 right-20 bottom-28 z-10 text-white"
      >
        <div className="flex items-center gap-2 mb-2">
          <Link href={`/profile/${talent.username}`} className="font-semibold inline-flex items-center gap-1.5">
            {talent.name}
            {talent.verified && <VerifiedBadge />}
          </Link>
          <span className="text-white/60 text-[11px]">·</span>
          <span className="text-[11px] text-white/70 tnum">{formatNumber(talent.followers)} followers</span>
        </div>

        <p className="text-sm leading-snug text-white/95 mb-3 line-clamp-2">{reel.caption}</p>

        {/* Compact typecast strip */}
        <div className="flex flex-wrap gap-1.5">
          <TypecastBadge>{talent.typecast.gender}</TypecastBadge>
          <TypecastBadge>{talent.typecast.ageRange[0]}–{talent.typecast.ageRange[1]}</TypecastBadge>
          <TypecastBadge>{talent.typecast.heightCm}cm</TypecastBadge>
          {talent.typecast.bodyType && <TypecastBadge>{talent.typecast.bodyType}</TypecastBadge>}
          {talent.typecast.location && <TypecastBadge>{talent.typecast.location}</TypecastBadge>}
        </div>
      </motion.div>

      {/* Sheets */}
      <AnimatePresence>
        {showInfo && <TypecastSheet talent={talent} onClose={() => setShowInfo(false)} />}
        {showInvite && (
          <InviteSheet
            talent={talent}
            auditions={auditions}
            defaultId={defaultAuditionId}
            onClose={() => setShowInvite(false)}
          />
        )}
      </AnimatePresence>
    </div>
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
                <div className="text-[10px] text-text-muted">@{talent.username}</div>
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
              className="h-11 rounded-xl bg-gold text-bg text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" /> Message
            </Link>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function InviteSheet({
  talent, auditions, defaultId, onClose,
}: {
  talent: Talent;
  auditions: ReturnType<typeof loadAuditions>;
  defaultId: string | null;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(defaultId);
  const [sent, setSent] = useState(false);

  function invite() {
    setSent(true);
    haptic("success");
    setTimeout(onClose, 1300);
  }

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
        {sent ? (
          <div className="flex flex-col items-center py-10 px-6 gap-3">
            <div className="w-14 h-14 rounded-full bg-success/15 grid place-items-center">
              <Check className="w-7 h-7 text-success" strokeWidth={2.5} />
            </div>
            <p className="font-display text-xl">Invitation sent</p>
            <p className="text-text-muted text-sm text-center">{talent.name} will see it in their alerts.</p>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-xl">Invite to audition</h3>
                <p className="text-[11px] text-text-muted">Pick a role for {talent.name}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-bg-muted grid place-items-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {auditions.length === 0 ? (
              <div className="rounded-2xl border border-border bg-bg p-4 text-center">
                <p className="text-sm text-text-muted">You haven't posted any auditions yet.</p>
                <Link
                  href="/pro/audition/new"
                  className="inline-flex mt-3 h-10 px-4 rounded-full bg-gold text-bg text-xs font-semibold items-center gap-1.5"
                >
                  <Megaphone className="w-3.5 h-3.5" /> Post one now
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {auditions.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setPicked(a.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-colors",
                        picked === a.id ? "border-gold bg-gold/10" : "border-border bg-bg-elevated"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-widest text-gold">{a.type}</div>
                          <div className="text-sm font-semibold leading-tight truncate">{a.title}</div>
                          <div className="text-[11px] text-text-muted truncate mt-0.5">{a.studio} · {a.location}</div>
                        </div>
                        {picked === a.id && (
                          <div className="w-5 h-5 rounded-full bg-gold grid place-items-center shrink-0">
                            <Check className="w-3 h-3 text-bg" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={invite}
                  disabled={!picked}
                  className={cn(
                    "w-full h-12 rounded-2xl font-semibold inline-flex items-center justify-center gap-2",
                    picked ? "bg-gold text-bg" : "bg-bg text-text-subtle"
                  )}
                >
                  <Megaphone className="w-4 h-4" /> Send invitation
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
}

function Stat({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-text-muted">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}

function ColorStat({ label, color }: { label: string; color: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-text-muted">{label}</div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="w-5 h-5 rounded-full border border-border" style={{ background: color }} />
        <span className="text-[11px] font-mono text-text-muted">{color}</span>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-[10px] uppercase tracking-widest text-text-muted mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
