"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Trash2, Flag } from "lucide-react";
import { ReportSheet } from "@/components/ReportSheet";
import { useHiddenUsers } from "@/lib/cloud/safety";
import { Avatar } from "@/components/Avatar";
import {
  addReelComment, deleteReelComment, fetchReelComments, currentSocialUser, type ReelComment,
} from "@/lib/cloud/social";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";

function ago(iso: string, he: boolean) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return he ? "עכשיו" : "now";
  if (m < 60) return he ? `לפני ${m} ד׳` : `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return he ? `לפני ${h} ש׳` : `${h}h`;
  const d = Math.round(h / 24);
  return he ? `לפני ${d} ימים` : `${d}d`;
}

/** Bottom sheet with a reel's comments, Instagram / TikTok style. */
export function ReelCommentsSheet({ reelId, ownerId, onClose }: { reelId: string; ownerId: string; onClose: () => void }) {
  const { lang } = useT();
  const he = lang === "he";
  const [items, setItems] = useState<ReelComment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<"" | "signed-out" | "failed">("");
  const me = currentSocialUser();
  const listRef = useRef<HTMLDivElement>(null);
  const hidden = useHiddenUsers();
  const [reporting, setReporting] = useState<ReelComment | null>(null);
  const shown = items?.filter((c) => !hidden.has(c.user_id)) ?? null;

  useEffect(() => {
    let alive = true;
    fetchReelComments(reelId).then((c) => { if (alive) setItems(c); });
    return () => { alive = false; };
  }, [reelId]);

  useEffect(() => { listRef.current?.scrollTo({ top: 1e6 }); }, [items?.length]);

  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true); setErr("");
    const r = await addReelComment(reelId, ownerId, text);
    setBusy(false);
    if (r === "signed-out") { setErr("signed-out"); return; }
    if (!r) { setErr("failed"); return; }
    haptic("light");
    setItems((cur) => [...(cur ?? []), r]);
    setText("");
  }

  async function remove(c: ReelComment) {
    if (await deleteReelComment(c)) setItems((cur) => (cur ?? []).filter((x) => x.id !== c.id));
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <motion.div
        role="dialog" aria-modal="true" aria-label={he ? "תגובות" : "Comments"}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed bottom-0 inset-x-0 max-w-[440px] mx-auto z-50 bg-bg-elevated text-text border-t border-border rounded-t-3xl h-[70dvh] flex flex-col"
        dir={he ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h3 className="font-display text-lg">{he ? "תגובות" : "Comments"}{shown ? ` · ${shown.length}` : ""}</h3>
          <button onClick={onClose} aria-label={he ? "סגירה" : "Close"} className="w-10 h-10 rounded-full hover:bg-bg-muted grid place-items-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {shown === null && <p className="text-sm text-text-muted text-center py-8">{he ? "טוען…" : "Loading…"}</p>}
          {shown?.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">{he ? "עוד אין תגובות. תהיו הראשונים!" : "No comments yet. Be the first!"}</p>
          )}
          {shown?.map((c) => (
            <div key={c.id} className="flex items-start gap-3">
              <Avatar src={c.author_photo} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text-muted">
                  <span className="font-semibold text-text">{c.author_name || (he ? "משתמש" : "User")}</span>
                  {c.user_id === ownerId && <span className="ms-1 text-gold">· {he ? "יוצר/ת" : "Creator"}</span>}
                  <span className="ms-2">{ago(c.created_at, he)}</span>
                </div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap break-words" dir="auto">{c.body}</p>
              </div>
              {me && me !== c.user_id && (
                <button onClick={() => setReporting(c)} aria-label={he ? "דיווח על תגובה" : "Report comment"}
                  className="w-9 h-9 grid place-items-center rounded-full text-text-subtle hover:text-terra">
                  <Flag className="w-4 h-4" />
                </button>
              )}
              {me && (me === c.user_id || me === ownerId) && (
                <button onClick={() => remove(c)} aria-label={he ? "מחיקת תגובה" : "Delete comment"}
                  className="w-9 h-9 grid place-items-center rounded-full text-text-muted hover:text-terra">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {err && (
          <div className="px-5 pb-2 text-xs text-terra" role="alert">
            {err === "signed-out"
              ? <>{he ? "צריך להתחבר כדי להגיב." : "Sign in to comment."} <Link href="/login" className="underline font-semibold">{he ? "התחברות" : "Sign in"}</Link></>
              : he ? "התגובה לא נשלחה. נסו שוב." : "Couldn't post. Try again."}
          </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); void send(); }}
          className="flex items-center gap-2 px-4 py-3 border-t border-border pb-[calc(env(safe-area-inset-bottom)+12px)]"
        >
          <input
            value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} dir="auto"
            placeholder={he ? "הוספת תגובה…" : "Add a comment…"} aria-label={he ? "תגובה" : "Comment"}
            className="flex-1 h-11 px-4 rounded-full bg-bg border border-border text-sm outline-none focus:border-gold"
          />
          <button type="submit" disabled={!text.trim() || busy} aria-label={he ? "שליחה" : "Send"}
            className="w-11 h-11 rounded-full bg-gold text-on-accent grid place-items-center disabled:opacity-40">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
      <AnimatePresence>
        {reporting && (
          <ReportSheet kind="comment" targetUser={reporting.user_id} targetId={reporting.id} onClose={() => setReporting(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
