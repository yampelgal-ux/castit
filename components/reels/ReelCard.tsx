"use client";

// One full-screen reel. Mixes the best of TikTok (right action rail with
// live counts, progress bar, tap to pause) and Instagram (double-tap heart,
// expandable caption, views + time under the name).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Eye, Volume2, VolumeX, Play } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ReelCommentsSheet } from "./ReelCommentsSheet";
import { ReelManageSheet } from "./ReelManageSheet";
import { ReportSheet } from "@/components/ReportSheet";
import { isRealUserId } from "@/lib/cloud/config";
import { shareReel } from "./share";
import { useReelStats, toggleReelLike, recordReelView } from "@/lib/cloud/social";
import { useMyReels } from "@/lib/reels-store";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { cn, formatNumber } from "@/lib/utils";
import { optLabel } from "@/lib/typecast-options";
import { usePoster } from "@/lib/video-poster";
import type { ReelPost, Talent } from "@/lib/mock-data";

// Sound is a feed-wide preference, like in both apps.
let feedMuted = true;

function ago(ts: number | undefined, he: boolean) {
  if (!ts) return "";
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return he ? `לפני ${m} דק׳` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return he ? `לפני ${h} שע׳` : `${h}h ago`;
  const d = Math.round(h / 24);
  return he ? `לפני ${d} ימים` : `${d}d ago`;
}

export function ReelCard({
  reel, talent, railExtra, cta, badge,
}: {
  reel: ReelPost;
  talent: Talent;
  /** Extra round buttons at the bottom of the action rail (casting tools). */
  railExtra?: React.ReactNode;
  /** Button under the caption, e.g. "Invite to audition". */
  cta?: React.ReactNode;
  /** Small pill at the top (e.g. match score). */
  badge?: React.ReactNode;
}) {
  const { lang, t } = useT();
  const he = lang === "he";
  const videoRef = useRef<HTMLVideoElement>(null);
  const poster = usePoster(reel.videoUrl, reel.poster || null);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(feedMuted);
  const [progress, setProgress] = useState(0);
  const [burst, setBurst] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [sheet, setSheet] = useState<null | "comments" | "manage" | "report">(null);
  const [toast, setToast] = useState("");
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stats = useReelStats(reel.id);
  const { toggleBookmark, bookmarks, userId } = useStore();
  const saved = bookmarks.has(reel.id);
  const myReel = useMyReels((s) => s.reels.find((r) => r.id === reel.id));
  const isMine = !!myReel || talent.id === userId;
  const likes = reel.likes + stats.likes;
  const comments = reel.comments + stats.comments;

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  // Play only while on screen; count a view after 2s of playback.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    let viewTimer: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver(([e]) => {
      setInView(e.isIntersecting);
      if (e.isIntersecting) {
        el.muted = feedMuted;
        setMuted(feedMuted);
        el.play().then(() => setPaused(false)).catch(() => setPaused(true));
        viewTimer = setTimeout(() => { if (!el.paused) void recordReelView(reel.id, talent.id); }, 2000);
      } else {
        el.pause();
        if (viewTimer) clearTimeout(viewTimer);
      }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); if (viewTimer) clearTimeout(viewTimer); };
  }, [reel.id, talent.id]);

  async function like(force?: boolean) {
    if (force && stats.liked) return;
    const ok = await toggleReelLike(reel.id, talent.id);
    if (!ok) { say(he ? "צריך להתחבר כדי לעשות לייק" : "Sign in to like"); return; }
    haptic(stats.liked ? "light" : "success");
  }

  // Single tap = pause/play, double tap = like (with a heart burst).
  function onTap() {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      lastTap.current = 0;
      setBurst((n) => n + 1);
      void like(true);
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(() => {
      const el = videoRef.current;
      if (!el) return;
      if (el.paused) { el.play().catch(() => {}); setPaused(false); } else { el.pause(); setPaused(true); }
    }, 280);
  }

  function toggleSound() {
    const el = videoRef.current;
    feedMuted = !feedMuted;
    setMuted(feedMuted);
    if (el) { el.muted = feedMuted; if (!feedMuted) el.play().catch(() => {}); }
  }

  const tc = talent.typecast;
  const chips = [
    tc?.ageRange ? `${tc.ageRange[0]}–${tc.ageRange[1]}` : "",
    tc?.heightCm ? `${tc.heightCm} ${he ? "ס״מ" : "cm"}` : "",
    tc?.location ? optLabel(tc.location, he) : "",
    ...(tc?.languages ?? []).slice(0, 2).map((l) => optLabel(l, he)),
  ].filter(Boolean);

  const RailBtn = ({ label, count, onClick, children, active }: { label: string; count?: string; onClick: () => void; children: React.ReactNode; active?: boolean }) => (
    <button onClick={onClick} aria-label={label} aria-pressed={active} className="flex flex-col items-center gap-1 text-white">
      <span className="w-12 h-12 rounded-full bg-black/25 backdrop-blur-sm grid place-items-center">{children}</span>
      {count !== undefined && <span className="text-xs font-semibold tnum drop-shadow">{count}</span>}
    </button>
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black select-none">
      <video
        ref={videoRef}
        poster={poster}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
        className="absolute inset-0 w-full h-full object-cover"
      >
        {inView && <source src={reel.videoUrl} />}
      </video>

      {/* Tap layer */}
      <button type="button" onClick={onTap} aria-label={paused ? (he ? "הפעלה" : "Play") : (he ? "השהיה" : "Pause")}
        className="absolute inset-0 w-full h-full cursor-pointer" />

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35 pointer-events-none" />

      {/* Center feedback */}
      <AnimatePresence>
        {paused && (
          <motion.span key="p" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-black/40 grid place-items-center text-white pointer-events-none">
            <Play className="w-9 h-9 fill-white ms-1" />
          </motion.span>
        )}
        {burst > 0 && (
          <motion.span key={`h${burst}`} initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: [0.3, 1.2, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 0.9 }} onAnimationComplete={() => setBurst(0)}
            className="absolute inset-0 m-auto w-28 h-28 grid place-items-center pointer-events-none">
            <Heart className="w-28 h-28 fill-danger stroke-danger drop-shadow-2xl" />
          </motion.span>
        )}
      </AnimatePresence>

      {/* Sound + badge */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+64px)] inset-x-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">{badge}</div>
        <button onClick={toggleSound} aria-label={muted ? (he ? "הפעלת סאונד" : "Sound on") : (he ? "השתקה" : "Mute")}
          className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur grid place-items-center text-white">
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Action rail */}
      <div className="absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+104px)] z-10 flex flex-col items-center gap-3.5">
        <Link href={`/profile/${talent.username}`} aria-label={talent.name} className="mb-1">
          <Avatar src={talent.photo} seed={talent.name} size={48} ring />
        </Link>
        <RailBtn label={he ? "לייק" : "Like"} count={formatNumber(likes)} onClick={() => void like()} active={stats.liked}>
          <Heart className={cn("w-7 h-7 transition-transform", stats.liked && "fill-danger stroke-danger scale-110")} />
        </RailBtn>
        <RailBtn label={he ? "תגובות" : "Comments"} count={formatNumber(comments)} onClick={() => setSheet("comments")}>
          <MessageCircle className="w-7 h-7" />
        </RailBtn>
        <RailBtn label={he ? "שיתוף" : "Share"} count={he ? "שיתוף" : "Share"}
          onClick={async () => { const r = await shareReel(talent.username, reel.caption, he); if (r === "copied") say(he ? "הקישור הועתק" : "Link copied"); }}>
          <Send className="w-6 h-6" />
        </RailBtn>
        <RailBtn label={saved ? (he ? "הסרה מהשמורים" : "Unsave") : (he ? "שמירה" : "Save")} count={saved ? t("feed.saved") : t("feed.save")}
          active={saved} onClick={() => { toggleBookmark(reel.id); haptic(saved ? "light" : "medium"); }}>
          <Bookmark className={cn("w-6 h-6", saved && "fill-hi text-hi")} />
        </RailBtn>
        {railExtra}
        {isMine && myReel && (
          <RailBtn label={he ? "הגדרות הסרטון" : "Video settings"} onClick={() => setSheet("manage")}>
            <MoreHorizontal className="w-6 h-6" />
          </RailBtn>
        )}
        {!isMine && isRealUserId(talent.id) && (
          <RailBtn label={he ? "דיווח על הסרטון" : "Report video"} onClick={() => setSheet("report")}>
            <MoreHorizontal className="w-6 h-6" />
          </RailBtn>
        )}
      </div>

      {/* Caption block */}
      <div className="absolute left-4 right-20 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-10 text-white" dir={he ? "rtl" : "ltr"}>
        <div className="flex items-center gap-2">
          <Link href={`/profile/${talent.username}`} className="font-bold text-[0.95rem]">{talent.name || `@${talent.username}`}</Link>
          {talent.verified && <VerifiedBadge />}
        </div>
        <div className="text-[0.75rem] text-white/75 mt-0.5 flex items-center gap-1.5 tnum">
          <span>@{talent.username}</span>
          <span aria-hidden>·</span>
          <Eye className="w-3.5 h-3.5" aria-hidden />
          <span>{formatNumber(stats.views)} {he ? "צפיות" : "views"}</span>
          {reel.createdAt ? <><span aria-hidden>·</span><span>{ago(reel.createdAt, he)}</span></> : null}
        </div>
        {reel.caption && (
          <button onClick={() => setExpanded((x) => !x)} className="block text-start mt-2 text-sm leading-snug" dir="auto">
            <span className={cn(!expanded && "line-clamp-2")}>{reel.caption}</span>
            {!expanded && reel.caption.length > 80 && <span className="text-white/60"> {he ? "עוד" : "more"}</span>}
          </button>
        )}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {chips.map((c) => (
              <span key={c} className="text-[0.6875rem] font-semibold px-2 py-1 rounded-full bg-white/15 backdrop-blur border border-white/20">{c}</span>
            ))}
          </div>
        )}
        {likes > 0 && (
          <div className="text-xs text-white/80 mt-2">
            <Heart className="inline w-3.5 h-3.5 fill-danger stroke-danger -mt-0.5" aria-hidden />{" "}
            {he ? `${formatNumber(likes)} אנשים אהבו` : `Liked by ${formatNumber(likes)}`}
            {comments > 0 && (
              <button onClick={() => setSheet("comments")} className="ms-2 underline underline-offset-2">
                {he ? `לכל ${formatNumber(comments)} התגובות` : `View all ${formatNumber(comments)} comments`}
              </button>
            )}
          </div>
        )}
        {cta && <div className="mt-3">{cta}</div>}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] inset-x-0 h-[3px] bg-white/15 z-10" aria-hidden>
        <div className="h-full bg-hi" style={{ width: `${progress * 100}%` }} />
      </div>

      {toast && (
        <div role="status" className="absolute top-[calc(env(safe-area-inset-top)+120px)] inset-x-0 mx-auto w-max max-w-[85vw] z-20 rounded-full bg-black/80 text-white text-xs px-4 py-2">{toast}</div>
      )}

      <AnimatePresence>
        {sheet === "comments" && <ReelCommentsSheet reelId={reel.id} ownerId={talent.id} onClose={() => setSheet(null)} />}
        {sheet === "report" && <ReportSheet kind="reel" targetUser={talent.id} targetId={reel.id} onClose={() => setSheet(null)} />}
        {sheet === "manage" && myReel && (
          <ReelManageSheet reel={myReel} onClose={() => setSheet(null)} onComments={() => setSheet("comments")} />
        )}
      </AnimatePresence>
    </div>
  );
}
