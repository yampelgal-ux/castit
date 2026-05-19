"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Share2, Send, Music2, Bookmark } from "lucide-react";
import { REELS, TALENTS } from "@/lib/mock-data";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { TypecastBadge } from "@/components/TypecastBadge";
import { AnimatedLike } from "@/components/AnimatedLike";
import { Brand } from "@/components/Brand";
import { LazyVideo } from "@/components/LazyVideo";
import { useStore } from "@/lib/store";
import { haptic } from "@/lib/haptics";
import { cn, formatNumber } from "@/lib/utils";

export default function FeedPage() {
  return (
    <div className="snap-feed no-scrollbar bg-black -mx-0">
      {/* Header overlay */}
      <div className="fixed top-0 inset-x-0 z-30 max-w-[440px] mx-auto px-5 pt-4 pb-3 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
        <Brand size="sm" />
        <div className="flex items-center gap-4 text-xs">
          <span className="text-text-muted">Following</span>
          <span className="font-semibold relative">
            For You
            <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold rounded-full" />
          </span>
        </div>
      </div>

      {REELS.map((reel) => {
        const talent = TALENTS.find((t) => t.id === reel.talentId)!;
        return <ReelView key={reel.id} reel={reel} talent={talent} />;
      })}
    </div>
  );
}

function ReelView({ reel, talent }: { reel: any; talent: any }) {
  const [liked, setLiked] = useState(false);
  const { toggleLike, toggleBookmark, bookmarks } = useStore();
  const bookmarked = bookmarks.has(reel.id);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <LazyVideo
        src={reel.videoUrl}
        poster={reel.poster}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

      {/* Right rail */}
      <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-1">
          <Avatar src={talent.photo} size={48} ring />
          <button className="-mt-3 w-5 h-5 rounded-full bg-danger text-white text-sm grid place-items-center font-bold leading-none">
            +
          </button>
        </div>

        <Action
          icon={
            <AnimatedLike
              active={liked}
              onClick={() => {
                setLiked(!liked);
                toggleLike(reel.id);
                haptic(liked ? "light" : "success");
              }}
              size={32}
            />
          }
          label={formatNumber(reel.likes + (liked ? 1 : 0))}
        />
        <Action icon={<MessageCircle className="w-7 h-7" />} label={formatNumber(reel.comments)} />
        <button
          onClick={() => { toggleBookmark(reel.id); haptic(bookmarked ? "light" : "medium"); }}
          className="flex flex-col items-center gap-1 text-white"
          aria-label={bookmarked ? "Remove bookmark" : "Save"}
        >
          <Bookmark className={cn("w-7 h-7 transition-colors", bookmarked && "fill-gold text-gold")} />
          <span className="text-[11px] font-medium tnum">{bookmarked ? "Saved" : "Save"}</span>
        </button>
        <Action icon={<Send className="w-7 h-7" />} label="Send" />
        <Action icon={<Share2 className="w-7 h-7" />} label={formatNumber(reel.shares)} />
      </div>

      {/* Bottom info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute left-4 right-20 bottom-24 z-10"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold">@{talent.username}</span>
          {talent.verified && <VerifiedBadge />}
          <button className="ml-1 px-3 py-1 text-[11px] font-semibold rounded-full bg-white/10 backdrop-blur border border-white/20">
            Follow
          </button>
        </div>
        <p className="text-sm leading-snug text-white/95 mb-3">{reel.caption}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <TypecastBadge>{talent.typecast.heightCm}cm</TypecastBadge>
          <TypecastBadge color={talent.typecast.eyeColor}>Eyes</TypecastBadge>
          <TypecastBadge color={talent.typecast.hairColor}>{talent.typecast.hairLength} hair</TypecastBadge>
          <TypecastBadge>{talent.typecast.languages.slice(0, 2).join(" · ")}</TypecastBadge>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/80">
          <Music2 className="w-3.5 h-3.5" />
          <span className="truncate">Original audio — {talent.name}</span>
        </div>
      </motion.div>

      {/* Send to casting CTA */}
      <button className="absolute left-4 bottom-6 z-10 px-4 py-2.5 rounded-full bg-gold text-bg font-semibold text-xs shadow-lg shadow-gold/20">
        ✦ Send to a Casting Pro
      </button>
    </div>
  );
}

function Action({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-white">
      {icon}
      <span className="text-[11px] font-medium tnum">{label}</span>
    </div>
  );
}
