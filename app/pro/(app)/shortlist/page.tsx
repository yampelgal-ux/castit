"use client";
import { useAllTalents } from "@/lib/cloud/talents";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, MessageCircle, Megaphone, X, Share2 } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { CreateShareLinkSheet } from "@/components/CreateShareLinkSheet";
import { SendAuditionSheet } from "@/components/SendAuditionSheet";
import { useT } from "@/lib/i18n";
import { TALENTS } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { haptic } from "@/lib/haptics";
import { formatNumber } from "@/lib/utils";

export default function ShortlistPage() {
  const { shortlist, toggleShortlist } = useStore();
  const allTalents = useAllTalents();
  const saved = allTalents.filter((t) => shortlist.has(t.id));
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteFor, setInviteFor] = useState<{ id: string; name: string; photo: string } | null>(null);
  const { lang } = useT();
  const L = (h: string, e: string) => (lang === "he" ? h : e);

  return (
    <div className="min-h-dvh bg-bg pb-8">
      <Header
        back
        title={`${L("רשימה קצרה", "Shortlist")} (${saved.length})`}
        right={saved.length > 0 && (
          <button
            onClick={() => { setShareOpen(true); haptic("light"); }}
            className="text-[0.6875rem] text-gold font-semibold inline-flex items-center gap-1"
          >
            <Share2 className="w-3 h-3" /> Share
          </button>
        )}
      />

      {saved.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          tone="gold"
          title={L("עוד אין שחקנים ברשימה הקצרה", "No talent shortlisted yet")}
          description={L("לחצו על סימן השמירה בסרטון או בפרופיל כדי לשמור שחקנים כאן.", "Tap the bookmark icon on a reel or profile to save talent here.")}
          ctaLabel={L("לרילס", "Discover reels")}
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
                  <p className="text-[0.6875rem] text-text-muted truncate mt-0.5">
                    {t.typecast.gender} · {t.typecast.ageRange[0]}–{t.typecast.ageRange[1]} · {t.typecast.heightCm}cm · {t.typecast.location}
                  </p>
                  <div className="text-[0.6875rem] text-text-subtle mt-1 tnum">
                    {formatNumber(t.followers)} {L("עוקבים", "followers")}
                  </div>
                </Link>
                <button
                  onClick={() => { toggleShortlist(t.id); haptic("light"); }}
                  className="w-8 h-8 rounded-full hover:bg-bg-muted grid place-items-center text-text-muted"
                  aria-label={L("הסרה מהרשימה", "Remove from shortlist")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                <Link
                  href={`/messages?with=${t.id}&name=${encodeURIComponent(t.name)}`}
                  className="h-9 rounded-full bg-bg-elevated border border-border text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> {L("הודעה", "Message")}
                </Link>
                <button
                  type="button"
                  onClick={() => setInviteFor({ id: t.id, name: t.name, photo: t.photo })}
                  className="h-9 rounded-full bg-gold text-on-accent text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Megaphone className="w-3.5 h-3.5" /> {L("הזמנה לאודישן", "Invite")}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <CreateShareLinkSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        talentIds={saved.map((t) => t.id)}
      />
      <SendAuditionSheet
        open={!!inviteFor}
        onClose={() => setInviteFor(null)}
        talent={inviteFor ?? { id: "", name: "", photo: "" }}
      />
    </div>
  );
}
