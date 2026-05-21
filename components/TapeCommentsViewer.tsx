"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Plus, Send, X, Play, Trash2 } from "lucide-react";
import {
  addTapeComment, removeTapeComment, getSubmission,
  type Submission, type Tape, type TapeComment,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";

// A video viewer with timeline comment markers + add-comment-at-current-time button.
// Used by pros to leave private time-coded feedback on a self-tape.
export function TapeCommentsViewer({
  submissionId,
  tape,
  onChange,
}: {
  submissionId: string;
  tape: Tape;
  onChange?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [comments, setComments] = useState<TapeComment[]>([]);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [composeAt, setComposeAt] = useState(0);

  function reload() {
    const s = getSubmission(submissionId);
    setComments((s?.comments ?? []).filter((c) => c.tapeRound === tape.round));
    onChange?.();
  }

  useEffect(() => { reload(); }, [submissionId, tape.round]);

  function startCompose() {
    const v = videoRef.current;
    v?.pause();
    setComposeAt(v?.currentTime ?? 0);
    setDraft("");
    setComposing(true);
  }
  function saveComment() {
    if (!draft.trim()) return;
    addTapeComment(submissionId, tape.round, composeAt, draft.trim());
    setComposing(false);
    setDraft("");
    reload();
  }
  function removeComment(id: string) {
    removeTapeComment(submissionId, id);
    reload();
  }
  function seekTo(sec: number) {
    if (!videoRef.current) return;
    videoRef.current.currentTime = sec;
    videoRef.current.play().catch(() => {});
  }

  const tapeComments = [...comments].sort((a, b) => a.timeSec - b.timeSec);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[11px] uppercase tracking-widest text-gold">
          Round {tape.round} · latest tape
        </div>
        <div className="text-[10px] text-text-muted">{fmtDate(tape.submittedAt)}</div>
      </div>

      <div className="rounded-2xl overflow-hidden bg-black relative">
        <div className="aspect-[9/16] max-h-[55dvh] relative">
          {tape.videoUrl ? (
            <video
              ref={videoRef}
              src={tape.videoUrl}
              poster={tape.posterUrl}
              controls
              playsInline
              className="w-full h-full object-cover"
              onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
              onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-text-muted">
              <MessageCircle className="w-10 h-10" />
            </div>
          )}

          {/* Timeline comment markers */}
          {duration > 0 && (
            <div className="absolute bottom-12 left-0 right-0 px-3 pointer-events-none">
              <div className="relative h-1 rounded-full bg-white/20">
                {tapeComments.map((c) => {
                  const pct = (c.timeSec / duration) * 100;
                  return (
                    <button
                      key={c.id}
                      onClick={() => seekTo(c.timeSec)}
                      title={c.text}
                      className="pointer-events-auto absolute -top-1 -ml-1 w-3 h-3 rounded-full bg-gold border-2 border-bg shadow"
                      style={{ left: `${pct}%` }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={startCompose}
        className="mt-2 w-full h-10 rounded-2xl border border-dashed border-border text-xs text-text-muted hover:text-gold hover:border-gold/40 inline-flex items-center justify-center gap-2"
      >
        <Plus className="w-3.5 h-3.5" />
        Add note at <span className="tnum">{fmtSec(currentTime)}</span>
      </button>

      {/* Comment list */}
      {tapeComments.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest text-text-muted px-1 flex items-center gap-1.5">
            <MessageCircle className="w-3 h-3" /> Notes ({tapeComments.length})
          </div>
          {tapeComments.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2 p-2.5 rounded-xl bg-bg-elevated border border-border"
            >
              <button
                onClick={() => seekTo(c.timeSec)}
                className="shrink-0 h-7 px-2 rounded-full bg-gold/15 text-gold border border-gold/30 text-[11px] font-semibold tnum inline-flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                {fmtSec(c.timeSec)}
              </button>
              <p className="flex-1 text-xs leading-relaxed">{c.text}</p>
              <button onClick={() => removeComment(c.id)} className="text-text-subtle hover:text-danger p-1">
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Compose sheet */}
      <AnimatePresence>
        {composing && (
          <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto">
            <div className="absolute inset-0 bg-black/60" onClick={() => setComposing(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5"
            >
              <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-semibold tnum">
                  {fmtSec(composeAt)}
                </span>
                <span className="text-xs text-text-muted">Note for this moment</span>
                <button onClick={() => setComposing(false)} className="ml-auto p-1 text-text-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                autoFocus
                placeholder="e.g. Great pause — felt earned. Or: the look down here read flat."
                className="w-full px-3 py-2.5 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
              />
              <button
                onClick={saveComment}
                disabled={!draft.trim()}
                className={cn(
                  "mt-3 w-full h-11 rounded-2xl font-semibold inline-flex items-center justify-center gap-2",
                  draft.trim() ? "bg-gold text-bg" : "bg-bg text-text-subtle"
                )}
              >
                <Send className="w-4 h-4" /> Save note
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function fmtSec(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}
