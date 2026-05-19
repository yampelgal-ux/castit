"use client";
import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { useStore } from "@/lib/store";
import { REELS, TALENTS } from "@/lib/mock-data";

export default function SavedPage() {
  const { bookmarks } = useStore();
  const saved = REELS.filter((r) => bookmarks.has(r.id));

  return (
    <div className="min-h-dvh">
      <Header back title="Saved" />

      {saved.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          tone="gold"
          title="Nothing saved yet"
          description="Tap the bookmark icon on any reel and find it here later."
          ctaLabel="Open the feed"
          ctaHref="/feed"
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 px-4 pt-4 pb-8">
          {saved.map((reel, i) => {
            const talent = TALENTS.find((t) => t.id === reel.talentId);
            return (
              <motion.div
                key={reel.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href="/feed" className="block relative aspect-[3/4] rounded-2xl overflow-hidden bg-bg-elevated group">
                  {reel.poster && (
                    <img src={reel.poster} alt="" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-[10px] text-white/80">@{talent?.username}</p>
                    <p className="text-xs text-white line-clamp-2 leading-tight mt-0.5">{reel.caption}</p>
                  </div>
                  <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur grid place-items-center">
                    <Bookmark className="w-3.5 h-3.5 fill-gold text-gold" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
