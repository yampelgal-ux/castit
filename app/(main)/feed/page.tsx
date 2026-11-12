"use client";
import Link from "next/link";
import { Film, Upload } from "lucide-react";
import { useAllReels } from "@/lib/cloud/talents";
import { Brand } from "@/components/Brand";
import { ReelCard } from "@/components/reels/ReelCard";
import { useT } from "@/lib/i18n";

export default function FeedPage() {
  const { lang } = useT();
  const he = lang === "he";
  const { reels, talents } = useAllReels();
  const items = reels
    .map((reel) => ({ reel, talent: talents.find((x) => x.id === reel.talentId) }))
    .filter((x) => x.talent);
  return (
    <div className="snap-feed no-scrollbar bg-black -mx-0">
      {/* Header overlay */}
      <div className="fixed top-0 inset-x-0 z-30 max-w-[440px] mx-auto px-5 pt-4 pb-3 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
        <Brand size="sm" className="text-white" />
        <Link href="/studio/upload" aria-label={he ? "העלאת סרטון" : "Upload a video"}
          className="h-9 px-3 rounded-full bg-hi text-on-hi text-xs font-bold inline-flex items-center gap-1.5">
          <Upload className="w-4 h-4" aria-hidden /> {he ? "סרטון חדש" : "New video"}
        </Link>
      </div>

      {items.map(({ reel, talent }) => <ReelCard key={reel.id} reel={reel} talent={talent!} />)}

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

