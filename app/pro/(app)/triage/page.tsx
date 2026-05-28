"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Zap, X, Check, Clock as ClockIcon, Sparkles, ChevronLeft,
  Volume2, VolumeX, ExternalLink, Loader2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import {
  loadTriageQueue, moveToCallback, moveToHold, rejectSubmission,
  type Submission, type Role, type Project,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

type QueueItem = { submission: Submission; role: Role; project: Project };

type Decision = "callback" | "hold" | "pass";

export default function ProTriagePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [history, setHistory] = useState<{ id: string; decision: Decision; prev: Submission }[]>([]);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-15, 15]);
  const callbackOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);
  const holdOpacity = useTransform(y, [-100, 0], [1, 0]);

  useEffect(() => {
    setQueue(loadTriageQueue());
    setLoaded(true);
  }, []);

  const current = queue[idx];
  const remaining = queue.length - idx;

  function decide(decision: Decision) {
    if (!current) return;
    const sub = current.submission;
    haptic("medium");
    if (decision === "callback") moveToCallback(sub.id);
    else if (decision === "hold") moveToHold(sub.id, undefined, 48);
    else rejectSubmission(sub.id);

    setHistory((h) => [...h, { id: sub.id, decision, prev: sub }]);
    setIdx((i) => i + 1);
    x.set(0);
    y.set(0);
  }

  function undo() {
    const last = history.at(-1);
    if (!last) return;
    // Reload queue from store to get fresh state
    // Note: this won't put the talent back at the current position if they moved,
    // but the original-state submission is preserved in history for record purposes.
    haptic("light");
    setHistory((h) => h.slice(0, -1));
    setIdx((i) => Math.max(0, i - 1));
    // We rely on the page reload / next decision to refetch. For best UX,
    // immediately patch the local queue back.
    setQueue((q) => {
      const copy = [...q];
      // Replace the item that was at idx-1 with its original state so the
      // user sees what they had before deciding.
      const prevIdx = Math.max(0, idx - 1);
      copy[prevIdx] = { ...copy[prevIdx], submission: last.prev };
      return copy;
    });
  }

  // Reset video on card change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [idx]);

  if (!loaded) return <div className="min-h-dvh bg-bg" />;

  if (queue.length === 0) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="Tape Triage" />
        <EmptyState
          icon={Zap}
          tone="gold"
          title="אין טייפים לסקירה"
          description="כשטאלנטים ישלחו טייפים חדשים, הם יופיעו כאן לסקירה מהירה."
          ctaLabel="חזור לדשבורד"
          ctaHref="/pro/dashboard"
        />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="Tape Triage" />
        <div className="px-4 mt-10 text-center">
          <Sparkles className="w-12 h-12 text-gold mx-auto" />
          <h2 className="font-display text-2xl mt-4">סיימת!</h2>
          <p className="text-sm text-text-muted mt-2">
            סקרת {history.length} טייפ{history.length !== 1 ? "ים" : ""}.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2 max-w-xs mx-auto">
            <div className="text-center p-3 rounded-2xl bg-success/10 border border-success/30">
              <div className="font-display text-2xl text-success font-bold">
                {history.filter((h) => h.decision === "callback").length}
              </div>
              <div className="text-[10px] text-text-muted mt-1">Callback</div>
            </div>
            <div className="text-center p-3 rounded-2xl bg-sage/10 border border-sage/30">
              <div className="font-display text-2xl text-sage font-bold">
                {history.filter((h) => h.decision === "hold").length}
              </div>
              <div className="text-[10px] text-text-muted mt-1">Hold</div>
            </div>
            <div className="text-center p-3 rounded-2xl bg-bg-elevated border border-border">
              <div className="font-display text-2xl text-text-muted font-bold">
                {history.filter((h) => h.decision === "pass").length}
              </div>
              <div className="text-[10px] text-text-muted mt-1">Pass</div>
            </div>
          </div>
          <div className="mt-8 flex gap-2 justify-center">
            <Link href="/pro/inbox" className="px-4 h-10 rounded-full bg-bg-elevated border border-border text-xs font-semibold inline-flex items-center">
              Action Inbox
            </Link>
            <Link href="/pro/dashboard" className="px-4 h-10 rounded-full bg-gold text-bg text-xs font-semibold inline-flex items-center">
              דשבורד
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sub = current.submission;
  const lastTape = sub.tapes.at(-1);

  return (
    <div className="min-h-dvh bg-bg overflow-hidden">
      <Header
        back
        title={`Triage ${idx + 1}/${queue.length}`}
        right={
          <button
            onClick={undo}
            disabled={history.length === 0}
            className="text-[11px] text-text-muted disabled:opacity-40"
          >
            Undo
          </button>
        }
      />

      {/* Progress bar */}
      <div className="px-4 mt-1">
        <div className="h-1 rounded-full bg-bg-elevated overflow-hidden">
          <div
            className="h-full bg-gold transition-all duration-200"
            style={{ width: `${(idx / queue.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card stack */}
      <div className="relative px-4 mt-4" style={{ height: "calc(100dvh - 220px)" }}>
        <AnimatePresence>
          <motion.div
            key={sub.id}
            className="absolute inset-x-4 top-0 rounded-3xl bg-bg-elevated border border-border overflow-hidden shadow-2xl"
            style={{ x, y, rotate, height: "100%" }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x > 120) decide("callback");
              else if (info.offset.x < -120) decide("pass");
              else if (info.offset.y < -120) decide("hold");
              else { x.set(0); y.set(0); }
            }}
          >
            {/* Decision overlays */}
            <motion.div
              style={{ opacity: callbackOpacity }}
              className="absolute top-6 left-6 z-20 px-3 py-1.5 rounded-xl bg-success text-bg font-display text-lg font-bold border-2 border-success rotate-[-12deg]"
            >
              CALLBACK
            </motion.div>
            <motion.div
              style={{ opacity: passOpacity }}
              className="absolute top-6 right-6 z-20 px-3 py-1.5 rounded-xl bg-danger text-white font-display text-lg font-bold border-2 border-danger rotate-[12deg]"
            >
              PASS
            </motion.div>
            <motion.div
              style={{ opacity: holdOpacity }}
              className="absolute top-1/4 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-xl bg-sage text-bg font-display text-lg font-bold border-2 border-sage"
            >
              HOLD
            </motion.div>

            {/* Video / poster */}
            <div className="relative w-full bg-black" style={{ aspectRatio: "9/16", maxHeight: "65%" }}>
              {lastTape?.videoUrl ? (
                <video
                  ref={videoRef}
                  src={lastTape.videoUrl}
                  poster={lastTape.posterUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted={muted}
                  playsInline
                />
              ) : lastTape?.posterUrl ? (
                <img src={lastTape.posterUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-text-subtle text-xs">
                  אין טייפ
                </div>
              )}

              {/* Mute toggle */}
              {lastTape?.videoUrl && (
                <button
                  onClick={() => setMuted((m) => !m)}
                  className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center text-white"
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}

              {/* Round indicator */}
              {sub.tapes.length > 1 && (
                <div className="absolute top-3 right-3 text-[9px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white font-semibold tracking-wider">
                  ROUND {sub.tapes.length}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-center gap-3">
                <img
                  src={sub.talentPhoto}
                  alt={sub.talentName}
                  className="w-11 h-11 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold">{sub.talentName}</div>
                  <div className="text-[11px] text-text-muted truncate">
                    {current.project.title} · {current.role.name}
                  </div>
                </div>
                <Link
                  href={`/pro/projects/${current.project.id}/role/${current.role.id}/submission/${sub.id}`}
                  className="w-8 h-8 rounded-full bg-bg border border-border grid place-items-center text-text-muted shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {sub.tapes.at(-1)?.note && (
                <p className="text-[11px] text-text-muted leading-relaxed mt-3 line-clamp-3">
                  &quot;{sub.tapes.at(-1)!.note}&quot;
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Decision buttons */}
      <div className="absolute bottom-6 left-0 right-0 px-8 flex items-center justify-between gap-4">
        <button
          onClick={() => decide("pass")}
          className="w-14 h-14 rounded-full bg-bg-elevated border-2 border-danger/50 text-danger grid place-items-center shadow-lg active:scale-95 transition"
          aria-label="Pass"
        >
          <X className="w-7 h-7" strokeWidth={2.5} />
        </button>
        <button
          onClick={() => decide("hold")}
          className="w-12 h-12 rounded-full bg-bg-elevated border-2 border-sage/50 text-sage grid place-items-center shadow-lg active:scale-95 transition"
          aria-label="Hold"
        >
          <ClockIcon className="w-5 h-5" strokeWidth={2.5} />
        </button>
        <button
          onClick={() => decide("callback")}
          className="w-14 h-14 rounded-full bg-success text-bg grid place-items-center shadow-xl active:scale-95 transition"
          aria-label="Callback"
        >
          <Check className="w-7 h-7" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
