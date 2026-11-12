"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { X, Eye, Heart, MessageCircle, Trash2, Pencil, Share2, Check } from "lucide-react";
import { useMyReels, type MyReel } from "@/lib/reels-store";
import { useReelStats } from "@/lib/cloud/social";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { formatNumber } from "@/lib/utils";
import { shareReel } from "./share";

/** Settings for one of my own videos: stats, caption, share, delete. */
export function ReelManageSheet({ reel, onClose, onComments }: { reel: MyReel; onClose: () => void; onComments?: () => void }) {
  const { lang } = useT();
  const he = lang === "he";
  const stats = useReelStats(reel.id);
  const rename = useMyReels((s) => s.rename);
  const remove = useMyReels((s) => s.remove);
  const username = useStore((s) => s.profile.username);
  const [caption, setCaption] = useState(reel.caption);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const Stat = ({ icon, n, label, onClick }: { icon: React.ReactNode; n: number; label: string; onClick?: () => void }) => (
    <button onClick={onClick} disabled={!onClick}
      className="flex-1 rounded-2xl bg-bg border border-border py-3 flex flex-col items-center gap-1 disabled:cursor-default">
      {icon}
      <span className="font-display text-xl tnum">{formatNumber(n)}</span>
      <span className="text-[0.6875rem] text-text-muted">{label}</span>
    </button>
  );

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <motion.div
        role="dialog" aria-modal="true" aria-label={he ? "הגדרות הסרטון" : "Video settings"}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed bottom-0 inset-x-0 max-w-[440px] mx-auto z-50 bg-bg-elevated text-text border-t border-border rounded-t-3xl max-h-[85dvh] overflow-y-auto"
        dir={he ? "rtl" : "ltr"}
      >
        <div className="p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl">{he ? "הגדרות הסרטון" : "Video settings"}</h3>
            <button onClick={onClose} aria-label={he ? "סגירה" : "Close"} className="w-10 h-10 rounded-full hover:bg-bg-muted grid place-items-center">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!reel.cloud && (
            <p className="text-xs text-terra mb-3">{he ? "הסרטון עדיין רק במכשיר הזה, ולכן אין לו צפיות. אפשר לפרסם אותו מההגדרות." : "This video is only on this device, so it has no views yet. Publish it from Settings."}</p>
          )}

          <div className="flex gap-2 mb-5">
            <Stat icon={<Eye className="w-5 h-5 text-gold" />} n={stats.views} label={he ? "צפיות" : "Views"} />
            <Stat icon={<Heart className="w-5 h-5 text-danger" />} n={stats.likes} label={he ? "לייקים" : "Likes"} />
            <Stat icon={<MessageCircle className="w-5 h-5" />} n={stats.comments} label={he ? "תגובות" : "Comments"} onClick={onComments} />
          </div>

          <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5 mb-1.5" htmlFor={`cap-${reel.id}`}>
            <Pencil className="w-3.5 h-3.5" /> {he ? "כיתוב" : "Caption"}
          </label>
          <div className="flex gap-2 mb-5">
            <input id={`cap-${reel.id}`} value={caption} dir="auto" maxLength={200}
              onChange={(e) => { setCaption(e.target.value); setSaved(false); }}
              className="flex-1 h-11 px-3 rounded-xl bg-bg border border-border text-sm outline-none focus:border-gold" />
            <button
              onClick={() => { rename(reel.id, caption.trim()); setSaved(true); haptic("light"); }}
              disabled={caption.trim() === reel.caption}
              className="h-11 px-4 rounded-xl bg-gold text-on-accent text-sm font-semibold disabled:opacity-40 inline-flex items-center gap-1">
              {saved ? <><Check className="w-4 h-4" /> {he ? "נשמר" : "Saved"}</> : he ? "שמירה" : "Save"}
            </button>
          </div>

          <button
            onClick={async () => { const r = await shareReel(username || "", reel.caption, he); if (r === "copied") { setCopied(true); setTimeout(() => setCopied(false), 2000); } }}
            className="w-full h-12 rounded-xl border border-border text-sm font-semibold inline-flex items-center justify-center gap-2 mb-2">
            <Share2 className="w-4 h-4" /> {copied ? (he ? "הקישור הועתק" : "Link copied") : he ? "שיתוף" : "Share"}
          </button>

          {confirm ? (
            <div className="rounded-xl border border-terra/50 bg-terra/10 p-3">
              <p className="text-sm mb-3">{he ? "למחוק את הסרטון? הוא יוסר מהפרופיל ומהפיד יחד עם הלייקים והתגובות." : "Delete this video? It's removed from your profile and the feed, with its likes and comments."}</p>
              <div className="flex gap-2">
                <button onClick={async () => { await remove(reel.id); haptic("medium"); onClose(); }}
                  className="flex-1 h-11 rounded-lg bg-terra text-white text-sm font-semibold">{he ? "כן, למחוק" : "Yes, delete"}</button>
                <button onClick={() => setConfirm(false)} className="flex-1 h-11 rounded-lg border border-border text-sm">{he ? "ביטול" : "Cancel"}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirm(true)}
              className="w-full h-12 rounded-xl text-terra text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-terra/10">
              <Trash2 className="w-4 h-4" /> {he ? "מחיקת הסרטון" : "Delete video"}
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}
