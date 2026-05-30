"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ThumbsUp, ThumbsDown, HelpCircle, AlertCircle, Check, Send,
  Sparkles, ChevronRight, Volume2, VolumeX,
} from "lucide-react";
import {
  getApprovalBySlug, logApprovalView, castVote, isExpired,
  type ApprovalSession, type ApprovalTalent, type ApprovalVote,
} from "@/lib/approval-store";
import { getTapePlaybackUrl } from "@/lib/tape-storage";
import { notifyProDirectorVote } from "@/lib/notifications-store";

export default function ApprovePage() {
  const { slug } = useParams<{ slug: string }>();
  const [session, setSession] = useState<ApprovalSession | null | undefined>(undefined);
  const [voterName, setVoterName] = useState("");
  const [askName, setAskName] = useState(false);
  const [pendingVote, setPendingVote] = useState<{ submissionId: string; vote: ApprovalVote } | null>(null);

  useEffect(() => {
    const s = getApprovalBySlug(slug);
    setSession(s ?? null);
    if (s) logApprovalView(slug);
    // Restore voter name from localStorage if returning
    const stored = typeof window !== "undefined" ? localStorage.getItem("castit_director_name") : null;
    if (stored) setVoterName(stored);
  }, [slug]);

  function vote(submissionId: string, v: ApprovalVote) {
    if (!session) return;
    if (!voterName.trim()) {
      setPendingVote({ submissionId, vote: v });
      setAskName(true);
      return;
    }
    castVote(slug, submissionId, v, voterName);
    const fresh = getApprovalBySlug(slug);
    if (fresh) {
      setSession({ ...fresh });
      const t = fresh.talents.find((x) => x.submissionId === submissionId);
      if (t) notifyProDirectorVote(voterName, t.talentName, v, slug);
    }
  }

  function submitName() {
    if (!voterName.trim()) return;
    localStorage.setItem("castit_director_name", voterName);
    setAskName(false);
    if (pendingVote) {
      castVote(slug, pendingVote.submissionId, pendingVote.vote, voterName);
      const fresh = getApprovalBySlug(slug);
      if (fresh) {
        setSession({ ...fresh });
        const t = fresh.talents.find((x) => x.submissionId === pendingVote.submissionId);
        if (t) notifyProDirectorVote(voterName, t.talentName, pendingVote.vote, slug);
      }
      setPendingVote(null);
    }
  }

  if (session === undefined) {
    return <div className="min-h-dvh bg-bg" />;
  }
  if (!session) {
    return (
      <div className="min-h-dvh bg-bg grid place-items-center p-6 text-center">
        <div>
          <AlertCircle className="w-10 h-10 text-text-subtle mx-auto opacity-60" />
          <h1 className="font-display text-2xl mt-4">Link not found</h1>
        </div>
      </div>
    );
  }
  if (isExpired(session)) {
    return (
      <div className="min-h-dvh bg-bg grid place-items-center p-6 text-center">
        <div>
          <AlertCircle className="w-10 h-10 text-text-subtle mx-auto opacity-60" />
          <h1 className="font-display text-2xl mt-4">This session has expired</h1>
          <p className="text-sm text-text-muted mt-1">Ask the sender for a new link.</p>
        </div>
      </div>
    );
  }

  const voted = session.talents.filter((t) => t.vote).length;

  return (
    <div className="min-h-dvh bg-bg pb-12">
      {/* Header band */}
      <div className="border-b border-border bg-bg-elevated/60">
        <div className="max-w-[640px] mx-auto px-5 py-6">
          <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">
            Director Review
          </div>
          <h1 className="font-display text-3xl tracking-editorial mt-1">{session.projectTitle}</h1>
          {session.roleName && (
            <p className="text-sm text-text-muted mt-1">{session.roleName}</p>
          )}
          {session.greeting && (
            <div className="mt-3 p-3 rounded-2xl bg-gold/8 border border-gold/30 text-xs leading-relaxed">
              {session.greeting}
            </div>
          )}
          <div className="text-[10px] text-text-subtle mt-3 inline-flex items-center gap-2">
            <span>{session.talents.length} tapes</span>
            <span>·</span>
            <span className="text-gold font-semibold tnum">{voted} voted</span>
            {voterName && (
              <>
                <span>·</span>
                <span>Voting as <strong>{voterName}</strong></span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tape cards */}
      <div className="max-w-[640px] mx-auto px-5 pt-5 space-y-4">
        {session.talents.map((t, i) => (
          <TalentCard key={t.submissionId} t={t} i={i} onVote={(v) => vote(t.submissionId, v)} />
        ))}
      </div>

      <div className="max-w-[640px] mx-auto px-5 mt-10 text-center">
        <div className="inline-flex items-center gap-1.5 text-[10px] text-text-subtle">
          <Sparkles className="w-3 h-3" /> Curated on CastIt · auto-syncs to the casting director
        </div>
      </div>

      {/* Name prompt */}
      <AnimatePresence>
        {askName && (
          <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto">
            <div className="absolute inset-0 bg-black/60" onClick={() => setAskName(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }}
              className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5"
            >
              <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />
              <h2 className="font-display text-xl mb-1">Your name</h2>
              <p className="text-xs text-text-muted mb-4">
                The casting director will see who voted on each tape.
              </p>
              <input
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
                placeholder="Full name"
                autoFocus
                className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
              />
              <button
                onClick={submitName}
                disabled={!voterName.trim()}
                className="w-full mt-3 h-12 rounded-2xl bg-gold text-bg font-semibold disabled:opacity-40"
              >
                Save & Vote
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const VOTE_META: Record<ApprovalVote, { label: string; cls: string; icon: typeof ThumbsUp }> = {
  yes:   { label: "Yes",   cls: "bg-success text-bg",      icon: ThumbsUp },
  maybe: { label: "Maybe", cls: "bg-gold text-bg",         icon: HelpCircle },
  no:    { label: "No",    cls: "bg-danger text-white",    icon: ThumbsDown },
};

function TalentCard({ t, i, onVote }: { t: ApprovalTalent; i: number; onVote: (v: ApprovalVote) => void }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    let revoke: (() => void) | undefined;
    (async () => {
      const { url, revoke: r } = await getTapePlaybackUrl({
        videoUrl: t.tapeUrl,
        blobKey: t.tapeBlobKey,
      });
      setVideoUrl(url);
      revoke = r;
    })();
    return () => { revoke?.(); };
  }, [t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="rounded-2xl bg-bg-elevated border border-border overflow-hidden"
    >
      {/* Video */}
      <div className="relative bg-black" style={{ aspectRatio: "9/16", maxHeight: "70vh" }}>
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            playsInline
            muted={muted}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-text-subtle text-xs">
            Loading tape...
          </div>
        )}
        <button
          onClick={() => setMuted((m) => !m)}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center text-white"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Talent info */}
      <div className="p-4 flex items-center gap-3">
        <img src={t.talentPhoto} alt={t.talentName} className="w-12 h-12 rounded-xl object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{t.talentName}</div>
          <div className="text-[11px] text-text-muted truncate">{t.roleName}</div>
          {t.vote && t.voterName && (
            <div className="text-[10px] mt-1 inline-flex items-center gap-1 text-text-muted">
              {(() => { const Icon = VOTE_META[t.vote].icon; return <Icon className="w-2.5 h-2.5" />; })()}
              <strong className="text-text">{t.voterName}</strong> marked {VOTE_META[t.vote].label}
            </div>
          )}
        </div>
      </div>

      {/* Vote buttons */}
      <div className="grid grid-cols-3 gap-1.5 p-3 border-t border-border bg-bg/40">
        {(["no", "maybe", "yes"] as ApprovalVote[]).map((v) => {
          const meta = VOTE_META[v];
          const Icon = meta.icon;
          const active = t.vote === v;
          return (
            <button
              key={v}
              onClick={() => onVote(v)}
              className={`h-11 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition ${
                active ? meta.cls : "bg-bg border border-border text-text-muted"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {meta.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
