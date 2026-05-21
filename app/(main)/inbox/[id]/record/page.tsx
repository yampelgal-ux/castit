"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, Circle, Square, RotateCcw, Send, X, AlertCircle,
  CheckCircle2, ScrollText, Clock, Camera,
} from "lucide-react";
import { Header } from "@/components/Header";
import {
  getSubmission, getRole, getProject, addTape,
  type Submission, type Role, type Project,
} from "@/lib/projects-store";
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

  function useTake() {
    if (!sub || takes.length === 0) return;
    const take = takes[selectedTake];
    // In a real backend this would upload to storage. For the demo we keep the blob URL.
    addTape(sub.id, {
      videoUrl: take.url,
      note: `Self-tape recorded in studio — ${formatTime(take.duration)}`,
    });
    router.replace("/inbox");
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
                  className="h-13 py-3 rounded-2xl bg-white/15 backdrop-blur border border-white/20 text-white font-semibold flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Another take
                </button>
                <button
                  onClick={useTake}
                  className="h-13 py-3 rounded-2xl bg-gold text-bg font-semibold flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send tape
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
