"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, MessageCircle, Megaphone, X } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { TALENTS } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { haptic } from "@/lib/haptics";
import { formatNumber } from "@/lib/utils";

export default function ShortlistPage() {
  const { shortlist, toggleShortlist } = useStore();
  const saved = TALENTS.filter((t) => shortlist.has(t.id));

  return (
    <div className="min-h-dvh bg-bg pb-8">
      <Header back title={`Shortlist (${saved.length})`} />

      {saved.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          tone="gold"
          title="No talent shortlisted yet"
          description="Tap the bookmark icon on a reel or profile to save talent here."
          ctaLabel="Discover reels"
          ctaHref="/pro/reels"
        />
      ) : (
        <div className="px-4 pt-4 space-y-2.5">
          {saved.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl bg-bg-elevated border border-border overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3">
                <Link href={`/profile/${t.username}`} className="shrink-0">
                  <img src={t.photo} alt={t.name} className="w-14 h-14 rounded-xl object-cover" />
                </Link>
                <Link href={`/profile/${t.username}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate">{t.name}</span>
                    {t.verified && <VerifiedBadge />}
                  </div>
                  <p className="text-[11px] text-text-muted truncate mt-0.5">
                    {t.typecast.gender} · {t.typecast.ageRange[0]}–{t.typecast.ageRange[1]} · {t.typecast.heightCm}cm · {t.typecast.location}
                  </p>
                  <div className="text-[10px] text-text-subtle mt-1 tnum">
                    {formatNumber(t.followers)} followers
                  </div>
                </Link>
                <button
                  onClick={() => { toggleShortlist(t.id); haptic("light"); }}
                  className="w-8 h-8 rounded-full hover:bg-bg-muted grid place-items-center text-text-muted"
                  aria-label="Remove from shortlist"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                <Link
                  href={`/messages?with=${t.id}&name=${encodeURIComponent(t.name)}`}
                  className="h-9 rounded-full bg-bg-elevated border border-border text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Message
                </Link>
                <Link
                  href="/pro/audition/new"
                  className="h-9 rounded-full bg-gold text-bg text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Megaphone className="w-3.5 h-3.5" /> Invite
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
