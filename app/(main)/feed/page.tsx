"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Share2, Music2, Bookmark, MoreHorizontal, Eye } from "lucide-react";
import { useAllReels } from "@/lib/cloud/talents";
import Link from "next/link";
import { Film, Upload } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { TypecastBadge } from "@/components/TypecastBadge";
import { AnimatedLike } from "@/components/AnimatedLike";
import { Brand } from "@/components/Brand";
import { LazyVideo } from "@/components/LazyVideo";
import { useStore } from "@/lib/store";
import { useMyReels } from "@/lib/reels-store";
import { useReelStats, toggleReelLike, recordReelView } from "@/lib/cloud/social";
import { ReelCommentsSheet } from "@/components/reels/ReelCommentsSheet";
import { ReelManageSheet } from "@/components/reels/ReelManageSheet";
import { shareReel } from "@/components/reels/share";
import type { ReelPost, Talent } from "@/lib/mock-data";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { cn, formatNumber } from "@/lib/utils";

export default function FeedPage() {
  const { t, lang } = useT();
  const he = lang === "he";
  const { reels, talents } = useAllReels();
  const items = reels
    .map((reel) => ({ reel, talent: talents.find((x) => x.id === reel.talentId) }))
    .filter((x) => x.talent);
  return (
    <div className="snap-feed no-scrollbar bg-black -mx-0">
      {/* Header overlay */}
      <div className="fixed top-0 inset-x-0 z-30 max-w-[440px] mx-auto px-5 pt-4 pb-3 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
        <Brand size="sm" />
        <div className="flex items-center gap-4 text-xs">
          <span className="text-text-muted">{t("feed.following")}</span>
          <span className="font-semibold relative">
            {t("feed.forYou")}
            <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold rounded-full" />
          </span>
        </div>
      </div>

      {items.map(({ reel, talent }) => <ReelView key={reel.id} reel={reel} talent={talent!} />)}

      {items.length === 0 && (
        <div className="h-dvh grid place-items-center px-8 text-center text-white">
          <div className="max-w-xs">
            <Film className="w-10 h-10 mx-auto text-hi" aria-hidden />
            <h2 className="font-display text-2xl mt-4">{he ? "עוד אין סרטונים בפיד" : "No videos in the feed yet"}</h2>
            <p className="text-sm text-white/70 mt-2">
              {he ? "כשתעלי סרטון לפרופיל, הוא יופיע כאן וגם אצל המלהקים." : "When you upload a video to your profile it shows up here and for casting directors."}
            </p>
            <Link href="/studio/upload" className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-hi text-on-hi font-semibold">
              <Upload className="w-4 h-4" aria-hidden /> {he ? "העלאת סרטון" : "Upload a video"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ReelView({ reel, talent }: { reel: ReelPost; talent: Talent }) {
  const { toggleBookmark, bookmarks, userId } = useStore();
  const bookmarked = bookmarks.has(reel.id);
  const { t, lang } = useT();
  const he = lang === "he";
  const router = useRouter();
  const stats = useReelStats(reel.id);
  const myReel = useMyReels((s) => s.reels.find((r) => r.id === reel.id));
  const isMine = !!myReel || talent.id === userId;
  const [sheet, setSheet] = useState<null | "comments" | "manage">(null);
  const [toast, setToast] = useState("");
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  async function like() {
    const ok = await toggleReelLike(reel.id, talent.id);
    if (!ok) { say(he ? "צריך להתחבר כדי לעשות לייק" : "Sign in to like"); return; }
    haptic(stats.liked ? "light" : "success");
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <LazyVideo
        src={reel.videoUrl}
        poster={reel.poster}
        className="absolute inset-0 w-full h-full object-cover"
        tapToUnmute
        onView={() => void recordReelView(reel.id, talent.id)}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

      {/* Right rail */}
      <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-5">
        <Link href={`/profile/${talent.username}`} className="flex flex-col items-center gap-1" aria-label={talent.name}>
          <Avatar src={talent.photo} seed={talent.name} size={48} ring />
        </Link>

        <Action
          icon={<AnimatedLike active={stats.liked} onClick={like} size={32} />}
          label={formatNumber(reel.likes + stats.likes)}
        />
        <button onClick={() => setSheet("comments")} className="flex flex-col items-center gap-1 text-white" aria-label={he ? "תגובות" : "Comments"}>
          <MessageCircle className="w-7 h-7" />
          <span className="text-[0.6875rem] font-medium tnum">{formatNumber(reel.comments + stats.comments)}</span>
        </button>
        <button
          onClick={() => { toggleBookmark(reel.id); haptic(bookmarked ? "light" : "medium"); }}
          className="flex flex-col items-center gap-1 text-white"
          aria-label={bookmarked ? "Remove bookmark" : "Save"}
        >
          <Bookmark className={cn("w-7 h-7 transition-colors", bookmarked && "fill-gold text-gold")} />
          <span className="text-[0.6875rem] font-medium tnum">{bookmarked ? t("feed.saved") : t("feed.save")}</span>
        </button>
        <button
          onClick={async () => { const r = await shareReel(talent.username, reel.caption, he); if (r === "copied") say(he ? "הקישור הועתק" : "Link copied"); }}
          className="flex flex-col items-center gap-1 text-white" aria-label={he ? "שיתוף" : "Share"}
        >
          <Share2 className="w-7 h-7" />
          <span className="text-[0.6875rem] font-medium">{he ? "שיתוף" : "Share"}</span>
        </button>
        {isMine && myReel && (
          <button onClick={() => setSheet("manage")} className="flex flex-col items-center gap-1 text-white" aria-label={he ? "הגדרות הסרטון" : "Video settings"}>
            <MoreHorizontal className="w-7 h-7" />
            <span className="text-[0.6875rem] font-medium tnum inline-flex items-center gap-0.5"><Eye className="w-3 h-3" />{formatNumber(stats.views)}</span>
          </button>
        )}
      </div>

      {/* Bottom info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute left-4 right-20 bottom-24 z-10"
      >
        <div className="flex items-center gap-2 mb-2">
          <Link href={`/profile/${talent.username}`} className="font-semibold">@{talent.username}</Link>
          {talent.verified && <VerifiedBadge />}
        </div>
        {reel.caption && <p className="text-sm leading-snug text-white/95 mb-3" dir="auto">{reel.caption}</p>}

        {talent.typecast && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {talent.typecast.heightCm ? <TypecastBadge>{talent.typecast.heightCm}cm</TypecastBadge> : null}
            {talent.typecast.eyeColor && <TypecastBadge color={talent.typecast.eyeColor}>{t("feed.eyes")}</TypecastBadge>}
            {talent.typecast.hairColor && <TypecastBadge color={talent.typecast.hairColor}>{talent.typecast.hairLength} {t("feed.hair")}</TypecastBadge>}
            {talent.typecast.languages?.length ? <TypecastBadge>{talent.typecast.languages.slice(0, 2).join(" · ")}</TypecastBadge> : null}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-white/80">
          <Music2 className="w-3.5 h-3.5" />
          <span className="truncate">{t("feed.originalAudio")} — {talent.name}</span>
        </div>
      </motion.div>

      {!isMine && (
        <button onClick={() => router.push(`/profile/${talent.username}`)}
          className="absolute left-4 bottom-6 z-10 px-4 py-2.5 rounded-full bg-gold text-on-accent font-semibold text-xs shadow-lg shadow-gold/20">
          ✦ {he ? "לפרופיל המלא" : "Full profile"}
        </button>
      )}

      {toast && (
        <div role="status" className="absolute top-20 inset-x-0 mx-auto w-max max-w-[85vw] z-20 rounded-full bg-black/80 text-white text-xs px-4 py-2">{toast}</div>
      )}

      <AnimatePresence>
        {sheet === "comments" && <ReelCommentsSheet reelId={reel.id} ownerId={talent.id} onClose={() => setSheet(null)} />}
        {sheet === "manage" && myReel && (
          <ReelManageSheet reel={myReel} onClose={() => setSheet(null)} onComments={() => setSheet("comments")} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Action({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-white">
      {icon}
      <span className="text-[0.6875rem] font-medium tnum">{label}</span>
    </div>
  );
}
