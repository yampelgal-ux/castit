"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, Circle, Square, RotateCcw, Send, X, AlertCircle,
  CheckCircle2, ScrollText, Clock, Camera, Wand2, Loader2, Sparkles,
} from "lucide-react";
import { Header } from "@/components/Header";
import {
  getSubmission, getRole, getProject, addTape, setTapeAnalysis,
  type Submission, type Role, type Project,
} from "@/lib/projects-store";
import { saveTapeVideo, newTapeKey } from "@/lib/tape-storage";
import { cn } from "@/lib/utils";

type RecState = "idle" | "countdown" | "recording" | "review";

const MAX_SEC = 120; // 2 min cap for a self-tape

export default function SelfTapeStudioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [sub, setSub] = useState<Submission | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  const [state, setState] = useState<RecState>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permError, setPermError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [takes, setTakes] = useState<{ url: string; blob: Blob; duration: number }[]>([]);
  const [selectedTake, setSelectedTake] = useState(0);
  const [showSides, setShowSides] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Aria pre-recording coaching
  const [coaching, setCoaching] = useState<string | null>(null);
  const [coachingOpen, setCoachingOpen] = useState(false);
  const [coachingLoading, setCoachingLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const reviewRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number | null>(null);

  // Load submission + role + project
  useEffect(() => {
    const s = getSubmission(id);
    setSub(s ?? null);
    if (s) {
      const r = getRole(s.roleId);
      setRole(r ?? null);
      if (r) setProject(getProject(r.projectId) ?? null);
    }
  }, [id]);

  // Get camera + mic on mount
  useEffect(() => {
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: true,
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (e: any) {
        setPermError(e?.message || "Camera permission denied");
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (tickRef.current) cancelAnimationFrame(tickRef.current);
    };
    // eslint-disable-next-line
  }, []);

  function startCountdown() {
    setCountdown(3);
    setState("countdown");
    let n = 3;
    const i = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(i);
        startRecording();
      } else {
        setCountdown(n);
      }
    }, 1000);
  }

  function startRecording() {
    if (!stream) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime });
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      const url = URL.createObjectURL(blob);
      setTakes((prev) => [...prev, { url, blob, duration: elapsed }]);
      setSelectedTake((prev) => takes.length); // newest take
      setState("review");
    };
    rec.start();
    recorderRef.current = rec;
    setElapsed(0);
    setState("recording");

    const startedAt = performance.now();
    function tick() {
      const sec = Math.floor((performance.now() - startedAt) / 1000);
      setElapsed(sec);
      if (sec >= MAX_SEC) {
        stopRecording();
        return;
      }
      tickRef.current = requestAnimationFrame(tick);
    }
    tickRef.current = requestAnimationFrame(tick);
  }

  function stopRecording() {
    if (tickRef.current) cancelAnimationFrame(tickRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  function retake() {
    setState("idle");
    setElapsed(0);
  }

  async function useTake() {
    if (!sub || !role || takes.length === 0) return;
    setSubmitting(true);
    const take = takes[selectedTake];
    const blobKey = newTapeKey(sub.id);
    try {
      await saveTapeVideo(blobKey, take.blob);
    } catch (e) {
      console.error("save tape video failed", e);
    }
    addTape(sub.id, {
      videoUrl: take.url,
      tapeBlobKey: blobKey,
      note: `Self-tape recorded in studio — ${formatTime(take.duration)}`,
    });

    // Fire-and-forget AI tape analysis. Uses Whisper + Claude.
    // Doesn't block the redirect — the analysis appears in the pro's
    // submission view when it lands.
    const round = (sub.tapes.length ?? 0) + 1;
    (async () => {
      try {
        const buf = await take.blob.arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        const res = await fetch("/api/aria/analyze-tape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaBase64: b64,
            mediaMimeType: take.blob.type || "video/webm",
            filename: `tape-${sub.id}-r${round}.webm`,
            role: {
              name: role.name,
              description: role.description,
              sides: role.sides,
            },
            takeCount: takes.length,
            durationSec: take.duration,
          }),
        });
        if (res.ok) {
          const analysis = await res.json();
          setTapeAnalysis(sub.id, round, {
            slateComplete: analysis.slateComplete ?? false,
            linesAccuracy: analysis.linesAccuracy,
            pacingNote: analysis.pacingNote,
            emotionalChoice: analysis.emotionalChoice,
            strengths: analysis.strengths ?? [],
            concerns: analysis.concerns ?? [],
            recommendation: analysis.recommendation ?? "hold",
            summary: analysis.summary ?? "",
            generatedAt: analysis.generatedAt ?? new Date().toISOString(),
          });
        }
      } catch (e) {
        console.warn("Tape analysis failed (non-blocking)", e);
      }
    })();

    router.replace("/inbox");
  }

  function arrayBufferToBase64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    return btoa(binary);
  }

  async function loadCoaching() {
    if (!role || coaching || coachingLoading) return;
    setCoachingLoading(true);
    try {
      const context = [
        `Role: ${role.name}`,
        role.description ? `Brief: ${role.description}` : null,
        role.sides ? `Sides:\n${role.sides}` : null,
      ].filter(Boolean).join("\n\n");
      const res = await fetch("/api/aria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "coach",
          messages: [{
            role: "user",
            content: `I'm about to record a self-tape for this role. Give me 3 specific direction notes — intent, physicality, and one craft tip (subtext / pace / button). Be concrete, not generic. Match the language of the sides.\n\n${context}`,
          }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCoaching(data.text ?? null);
      }
    } finally {
      setCoachingLoading(false);
    }
  }

  if (permError) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="Self-tape studio" />
        <div className="px-6 pt-10 text-center">
          <AlertCircle className="w-12 h-12 text-danger mx-auto" />
          <h2 className="font-display text-xl mt-4">Camera unavailable</h2>
          <p className="text-sm text-text-muted mt-2 max-w-xs mx-auto">{permError}</p>
          <p className="text-xs text-text-subtle mt-4">
            Open the app over HTTPS and allow camera + microphone access for the studio.
          </p>
        </div>
      </div>
    );
  }

  if (!sub || !role || !project) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="Self-tape studio" />
        <div className="px-6 pt-10 text-center text-text-muted text-sm">Audition not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="relative h-dvh w-full overflow-hidden">
        {/* Live preview */}
        {state !== "review" && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" /* mirror selfie */ }}
          />
        )}

        {/* Take playback in review state */}
        {state === "review" && takes[selectedTake] && (
          <video
            ref={reviewRef}
            src={takes[selectedTake].url}
            autoPlay
            controls
            playsInline
            className="absolute inset-0 w-full h-full object-cover bg-black"
          />
        )}

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 z-10 bg-gradient-to-b from-black/70 to-transparent">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-black/40 grid place-items-center">
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest opacity-70">{project.title}</div>
            <div className="text-sm font-semibold">{role.name}</div>
          </div>
          <button
            onClick={() => setShowSides(!showSides)}
            className={cn(
              "w-9 h-9 rounded-full grid place-items-center",
              showSides ? "bg-gold text-bg" : "bg-black/40 text-white"
            )}
          >
            <ScrollText className="w-4 h-4" />
          </button>
        </div>

        {/* Framing guide (rule of thirds) */}
        {state !== "review" && (
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-0 bottom-0 left-1/3 border-l border-white/15" />
            <div className="absolute top-0 bottom-0 right-1/3 border-r border-white/15" />
            <div className="absolute left-0 right-0 top-1/3 border-t border-white/15" />
            <div className="absolute left-0 right-0 bottom-1/3 border-b border-white/15" />
            <div className="absolute inset-x-0 top-[15%] flex justify-center">
              <div className="text-[10px] uppercase tracking-widest text-white/40 bg-black/30 px-2 py-0.5 rounded-full">
                Head here
              </div>
            </div>
          </div>
        )}

        {/* Sides overlay (top sheet, semi-transparent) */}
        <AnimatePresence>
          {showSides && state !== "review" && (role.sides || role.selfTapeInstructions) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-20 left-4 right-4 z-10 rounded-2xl bg-black/70 backdrop-blur p-3 max-h-[40dvh] overflow-y-auto border border-white/10"
            >
              {role.selfTapeInstructions && (
                <div className="text-[10px] uppercase tracking-widest text-gold mb-1">Instructions</div>
              )}
              {role.selfTapeInstructions && <p className="text-xs leading-relaxed mb-3">{role.selfTapeInstructions}</p>}
              {role.sides && (
                <>
                  <div className="text-[10px] uppercase tracking-widest text-gold mb-1">Sides</div>
                  <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono">{role.sides}</pre>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Countdown */}
        <AnimatePresence>
          {state === "countdown" && (
            <motion.div
              key={countdown}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center z-20 pointer-events-none"
            >
              <div className="font-display text-[120px] leading-none text-white drop-shadow-2xl">{countdown}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recording indicator */}
        {state === "recording" && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-2 bg-danger/90 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-semibold tnum">REC · {formatTime(elapsed)} / {formatTime(MAX_SEC)}</span>
            </div>
          </div>
        )}

        {/* Aria coaching panel (collapsible) */}
        {state === "idle" && (
          <div className="absolute bottom-44 left-4 right-4 z-10">
            <AnimatePresence>
              {coachingOpen && coaching && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mb-2 rounded-2xl bg-plum/20 backdrop-blur border border-plum/40 p-3 max-h-[35dvh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] uppercase tracking-widest text-plum-light font-semibold inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Aria's direction
                    </div>
                    <button onClick={() => setCoachingOpen(false)} className="text-white/60">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{coaching}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={async () => {
                if (!coaching) await loadCoaching();
                setCoachingOpen((o) => !o);
              }}
              className="w-full h-9 rounded-full bg-plum/30 backdrop-blur border border-plum/40 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              {coachingLoading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Aria מכינה הוראות...</>
              ) : coaching ? (
                <><Wand2 className="w-3.5 h-3.5" /> {coachingOpen ? "סגור" : "הצג"} הוראות בימוי של Aria</>
              ) : (
                <><Wand2 className="w-3.5 h-3.5" /> שאל את Aria על התפקיד</>
              )}
            </button>
          </div>
        )}

        {/* Slate prompt at start */}
        {state === "idle" && (
          <div className="absolute bottom-32 left-4 right-4 z-10 rounded-2xl bg-gold/15 backdrop-blur border border-gold/30 p-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">Slate first</div>
            <p className="text-xs mt-1">Say your name + height + agent (if any), then go into the scene.</p>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-0 inset-x-0 p-5 z-10 bg-gradient-to-t from-black/80 to-transparent">
          {state === "idle" && (
            <div className="flex items-center justify-center">
              <button
                onClick={startCountdown}
                className="w-20 h-20 rounded-full bg-danger grid place-items-center active:scale-95 transition-transform"
              >
                <Circle className="w-8 h-8 text-white fill-white" />
              </button>
            </div>
          )}

          {state === "recording" && (
            <div className="flex items-center justify-center">
              <button
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-white grid place-items-center"
              >
                <Square className="w-8 h-8 text-danger fill-danger" />
              </button>
            </div>
          )}

          {state === "review" && (
            <div className="space-y-3">
              {/* Takes selector */}
              {takes.length > 1 && (
                <div className="flex gap-1.5 justify-center">
                  {takes.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedTake(i)}
                      className={cn(
                        "px-3 h-8 rounded-full text-[11px] font-semibold border",
                        selectedTake === i ? "bg-gold text-bg border-gold" : "bg-black/50 text-white border-white/20"
                      )}
                    >
                      Take {i + 1} · {formatTime(t.duration)}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={retake}
                  disabled={submitting}
                  className="h-13 py-3 rounded-2xl bg-white/15 backdrop-blur border border-white/20 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" /> Another take
                </button>
                <button
                  onClick={useTake}
                  disabled={submitting}
                  className="h-13 py-3 rounded-2xl bg-gold text-bg font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send tape</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
