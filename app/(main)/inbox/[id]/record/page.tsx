"use client";
import { compressVideo, MAX_TAPE_SECONDS } from "@/lib/video-compress";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, Circle, Square, RotateCcw, Send, AlertCircle, CheckCircle2, ScrollText,
  Camera, Wand2, Loader2, Sparkles, Upload, FileVideo, SwitchCamera, ChevronDown, X,
} from "lucide-react";
import { Header } from "@/components/Header";
import {
  getSubmission, getRole, getProject, addTape,
  type Submission, type Role, type Project,
} from "@/lib/projects-store";
import { saveTapeVideo, newTapeKey } from "@/lib/tape-storage";
import { SidesFileViewer } from "@/components/SidesFileInput";
import { loadSidesFile } from "@/lib/sides-storage";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// Self-tape flow: choose (upload a file or record here) → record → review → send.
// The camera only turns on when the talent chooses to record, and the preview
// sits in a framed box with the sides and controls around it, never full-screen.
type Mode = "choose" | "camera" | "countdown" | "recording" | "review" | "sending" | "sent";
type Take = { url: string; blob: Blob; duration: number; uploaded?: boolean; filename?: string };

const MAX_SEC = 180; // 3 min cap for an in-app take
const MAX_FILE = 500 * 1024 * 1024;

export default function SelfTapeStudioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, lang, dir } = useT();
  const L = (he: string, en: string) => (lang === "he" ? he : en);

  const [sub, setSub] = useState<Submission | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  const [mode, setMode] = useState<Mode>("choose");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [camError, setCamError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [takes, setTakes] = useState<Take[]>([]);
  const [selected, setSelected] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [sendResult, setSendResult] = useState<"cloud" | "local" | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [shrink, setShrink] = useState<number | null>(null);
  const [showSides, setShowSides] = useState(true);

  const [coaching, setCoaching] = useState<string | null>(null);
  const [coachingOpen, setCoachingOpen] = useState(false);
  const [coachingLoading, setCoachingLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const phoneCamInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = getSubmission(id);
    setSub(s ?? null);
    if (s) {
      const r = getRole(s.roleId);
      setRole(r ?? null);
      if (r) setProject(getProject(r.projectId) ?? null);
    }
  }, [id]);

  // Always release the camera when leaving the page.
  useEffect(() => () => {
    stopStream();
    if (tickRef.current) cancelAnimationFrame(tickRef.current);
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }

  async function openCamera(face = facing) {
    setCamError(null);
    stopStream();
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: face, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = s;
      setMode("camera");
      // The <video> mounts with the camera mode; attach on the next frame.
      requestAnimationFrame(() => { if (videoRef.current) videoRef.current.srcObject = s; });
    } catch {
      setCamError(L(
        "אין גישה למצלמה. אשרו מצלמה ומיקרופון בהגדרות הדפדפן, או העלו קובץ שצילמתם.",
        "No camera access. Allow camera and microphone in the browser settings, or upload a file you recorded."
      ));
      setMode("choose");
    }
  }

  function flipCamera() {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    void openCamera(next);
  }

  function startCountdown() {
    haptic("medium");
    setCountdown(3);
    setMode("countdown");
    let n = 3;
    const i = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(i); startRecording(); }
      else setCountdown(n);
    }, 1000);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mime = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    // 720p at ~2.5Mbps: plenty for a self-tape, and keeps uploads small.
    const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 2_500_000 });
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
      addTake({ url: URL.createObjectURL(blob), blob, duration: elapsedRef.current });
    };
    rec.start(1000);
    recorderRef.current = rec;
    elapsedRef.current = 0;
    setElapsed(0);
    setMode("recording");
    const startedAt = performance.now();
    const tick = () => {
      const sec = Math.floor((performance.now() - startedAt) / 1000);
      elapsedRef.current = sec;
      setElapsed(sec);
      if (sec >= MAX_SEC) { stopRecording(); return; }
      tickRef.current = requestAnimationFrame(tick);
    };
    tickRef.current = requestAnimationFrame(tick);
  }

  function stopRecording() {
    haptic("light");
    if (tickRef.current) cancelAnimationFrame(tickRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }

  function addTake(take: Take) {
    setTakes((prev) => {
      setSelected(prev.length);
      return [...prev, take];
    });
    stopStream();
    setMode("review");
  }

  function getVideoDuration(file: Blob): Promise<number> {
    return new Promise((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      const url = URL.createObjectURL(file);
      v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Math.round(v.duration || 0)); };
      v.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
      v.src = url;
    });
  }

  async function handleFile(file: File) {
    setFileError(null);
    if (!file.type.startsWith("video/")) { setFileError(t("rec.errVideoOnly")); return; }
    if (file.size > MAX_FILE) { setFileError(t("rec.errTooBig")); return; }
    setReading(true);
    try {
      const duration = await getVideoDuration(file);
      if (duration > MAX_TAPE_SECONDS) {
        setFileError(L(`הסרטון ארוך מ-${MAX_TAPE_SECONDS / 60} דקות. כדאי לקצר אותו ולנסות שוב.`, `The video is longer than ${MAX_TAPE_SECONDS / 60} minutes. Trim it and try again.`));
        return;
      }
      addTake({ url: URL.createObjectURL(file), blob: file, duration, uploaded: true, filename: file.name });
    } finally {
      setReading(false);
    }
  }

  async function send() {
    if (!sub || takes.length === 0) return;
    const take = takes[selected];
    setSendError(null);
    setMode("sending");
    const blobKey = newTapeKey(sub.id);
    try {
      // Files from the gallery are often 4K: shrink them first (recorded takes already are small).
      const blob = take.uploaded ? await compressVideo(take.blob, { onProgress: (p) => setShrink(p) }) : take.blob;
      setShrink(null);
      const where = await saveTapeVideo(blobKey, blob);
      addTape(sub.id, {
        videoUrl: take.url,
        tapeBlobKey: blobKey,
        note: take.uploaded
          ? `Uploaded${take.filename ? `: ${take.filename}` : ""} · ${formatTime(take.duration)}`
          : `Self-tape recorded in studio · ${formatTime(take.duration)}`,
      });
      setSendResult(where);
      setMode("sent");
      haptic("success");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : L("השליחה נכשלה. נסו שוב.", "Sending failed. Try again."));
      setMode("review");
      haptic("error");
    }
  }

  async function practiceWithAria() {
    if (!role || !project) return;
    const payload: { title: string; context?: string; sides?: string; imageBase64?: string; imageMediaType?: string; fileText?: string } = {
      title: `${role.name} · ${project.title}`,
      context: role.description,
      sides: role.sides,
    };
    if (role.sidesFile) {
      try {
        const blob = await loadSidesFile(role.sidesFile.blobKey);
        if (blob?.type.startsWith("image/")) {
          const bytes = new Uint8Array(await blob.arrayBuffer());
          let bin = "";
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
          payload.imageBase64 = btoa(bin);
          payload.imageMediaType = ["image/png", "image/webp", "image/jpeg"].includes(blob.type) ? blob.type : "image/jpeg";
        } else if (blob && (blob.type === "text/plain" || role.sidesFile.name.endsWith(".txt"))) {
          payload.fileText = await blob.text();
        }
      } catch (e) {
        console.warn("could not hydrate sides file for Aria:", e);
      }
    }
    sessionStorage.setItem("castit_coach_incoming_scene", JSON.stringify(payload));
    router.push("/studio/coach");
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
            content: `I'm about to record a self-tape for this role. Give me 3 specific direction notes — intent, physicality, and one craft tip (subtext / pace / button). Be concrete, not generic. Answer in ${lang === "he" ? "Hebrew" : "English"}.\n\n${context}`,
          }],
        }),
      });
      if (res.ok) setCoaching((await res.json()).text ?? null);
    } finally {
      setCoachingLoading(false);
    }
  }

  if (!sub || !role || !project) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title={t("rec.studio")} />
        <div className="px-6 pt-10 text-center text-text-muted text-sm">{L("האודישן לא נמצא.", "Audition not found.")}</div>
      </div>
    );
  }

  const hasSides = !!(role.sides || role.selfTapeInstructions || role.sidesFile);
  const live = mode === "camera" || mode === "countdown" || mode === "recording";
  const take = takes[selected];

  return (
    <div className="min-h-dvh bg-bg" dir={dir}>
      <Header back title={t("rec.studio")} />

      <div className="px-4 pt-3 pb-10 space-y-4">
        {/* Role card */}
        <div className="sheet rounded-xl p-3 flex items-center gap-3">
          <span className="w-11 h-11 rounded-md clapper shrink-0" aria-hidden />
          <div className="min-w-0">
            <div className="text-xs text-text-muted truncate">{project.title}</div>
            <div className="font-display text-lg leading-tight truncate">{role.name}</div>
          </div>
        </div>

        {/* ── Choose ── */}
        {mode === "choose" && (
          <div className="space-y-3">
            <h2 className="font-display text-xl">{L("איך תרצו לשלוח את הטייפ?", "How do you want to send your tape?")}</h2>

            <label
              htmlFor="tape-file"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              className={cn(
                "block rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors",
                dragOver ? "border-border-strong bg-hi-soft" : "border-border-strong/40 bg-bg-elevated"
              )}
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-hi grid place-items-center border-2 border-border-strong">
                {reading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
              </div>
              <div className="font-display text-lg mt-3">{L("העלאת קובץ וידאו", "Upload a video file")}</div>
              <div className="text-sm text-text-muted mt-1">{L("בחרו מהגלריה או מהקבצים, או גררו לכאן", "Pick from your gallery or files, or drop it here")}</div>
              <div className="text-xs text-text-subtle mt-2">MP4 · MOV · WEBM · {L("עד 500MB", "up to 500MB")}</div>
            </label>
            <input id="tape-file" ref={fileInputRef} type="file" accept="video/*" className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => openCamera()} className="h-24 rounded-xl border-2 border-border-strong bg-bg-elevated flex flex-col items-center justify-center gap-1.5 font-semibold">
                <Video className="w-6 h-6" aria-hidden /> {L("הקלטה כאן", "Record here")}
              </button>
              <button onClick={() => phoneCamInputRef.current?.click()} className="h-24 rounded-xl border-2 border-border-strong bg-bg-elevated flex flex-col items-center justify-center gap-1.5 font-semibold">
                <Camera className="w-6 h-6" aria-hidden /> {t("rec.phoneCamShort")}
              </button>
            </div>
            <input ref={phoneCamInputRef} type="file" accept="video/*" capture="user" className="sr-only" tabIndex={-1}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

            {(fileError || camError) && (
              <div role="alert" className="flex gap-2 p-3 rounded-lg bg-terra/10 border border-terra/40 text-sm text-terra">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {fileError || camError}
              </div>
            )}
            {takes.length > 0 && (
              <button onClick={() => setMode("review")} className="w-full h-11 rounded-lg border border-border text-sm font-semibold">
                {L(`חזרה לטייקים (${takes.length})`, `Back to takes (${takes.length})`)}
              </button>
            )}
          </div>
        )}

        {/* ── Camera / recording ── */}
        {live && (
          <div className="space-y-3">
            <div className="relative mx-auto w-full max-w-[360px] aspect-[3/4] max-h-[52dvh] rounded-xl overflow-hidden bg-black border-2 border-border-strong">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"
                style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }} />
              {/* Framing guide */}
              <div className="absolute inset-x-0 top-[12%] flex justify-center pointer-events-none">
                <span className="text-xs text-white/70 bg-black/40 px-2 py-0.5 rounded-full">{t("rec.headHere")}</span>
              </div>
              {mode === "recording" && (
                <div className="absolute top-2 inset-x-0 flex justify-center">
                  <span className="flex items-center gap-2 bg-terra px-3 py-1 rounded-full text-white text-xs font-semibold tnum" role="status">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> REC {formatTime(elapsed)} / {formatTime(MAX_SEC)}
                  </span>
                </div>
              )}
              <AnimatePresence>
                {mode === "countdown" && (
                  <motion.div key={countdown} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 grid place-items-center bg-black/30" aria-live="assertive">
                    <span className="font-display text-[96px] leading-none text-white">{countdown}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {mode === "camera" && (
              <p className="text-center text-sm text-text-muted">{L("סלייט קודם: שם, גובה וסוכנות, ואז הסצנה.", "Slate first: name, height and agency, then the scene.")}</p>
            )}

            <div className="flex items-center justify-center gap-8">
              <button onClick={() => { stopStream(); setMode(takes.length ? "review" : "choose"); }} disabled={mode !== "camera"}
                aria-label={L("סגירת המצלמה", "Close camera")} className="w-12 h-12 rounded-full border-2 border-border-strong grid place-items-center disabled:opacity-30">
                <X className="w-5 h-5" />
              </button>
              {mode === "recording" ? (
                <button onClick={stopRecording} aria-label={L("עצירת ההקלטה", "Stop recording")}
                  className="w-20 h-20 rounded-full bg-bg-elevated border-4 border-border-strong grid place-items-center">
                  <Square className="w-8 h-8 text-terra fill-terra" />
                </button>
              ) : (
                <button onClick={startCountdown} disabled={mode !== "camera"} aria-label={L("התחלת הקלטה", "Start recording")}
                  className="w-20 h-20 rounded-full bg-terra border-4 border-border-strong grid place-items-center disabled:opacity-60">
                  <Circle className="w-8 h-8 text-white fill-white" />
                </button>
              )}
              <button onClick={flipCamera} disabled={mode !== "camera"} aria-label={L("החלפת מצלמה", "Switch camera")}
                className="w-12 h-12 rounded-full border-2 border-border-strong grid place-items-center disabled:opacity-30">
                <SwitchCamera className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Review / send ── */}
        {(mode === "review" || mode === "sending") && take && (
          <div className="space-y-3">
            <video key={take.url} src={take.url} controls playsInline
              className="mx-auto w-full max-w-[360px] max-h-[52dvh] rounded-xl bg-black border-2 border-border-strong" />
            {takes.length > 1 && (
              <div role="radiogroup" aria-label={L("בחירת טייק", "Choose a take")} className="flex gap-2 flex-wrap justify-center">
                {takes.map((tk, i) => (
                  <button key={i} role="radio" aria-checked={selected === i} onClick={() => setSelected(i)}
                    className={cn("h-10 px-3 rounded-full text-sm font-semibold border-2 inline-flex items-center gap-1.5",
                      selected === i ? "bg-hi text-on-hi border-border-strong" : "border-border")}>
                    {tk.uploaded && <FileVideo className="w-3.5 h-3.5" aria-hidden />}
                    {tk.uploaded ? L("קובץ", "File") : L(`טייק ${i + 1}`, `Take ${i + 1}`)} · {formatTime(tk.duration)}
                  </button>
                ))}
              </div>
            )}
            {sendError && (
              <div role="alert" className="flex gap-2 p-3 rounded-lg bg-terra/10 border border-terra/40 text-sm text-terra">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {sendError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode("choose")} disabled={mode === "sending"}
                className="h-12 rounded-lg border-2 border-border-strong font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                <RotateCcw className="w-4 h-4" aria-hidden /> {t("rec.anotherTake")}
              </button>
              <button onClick={send} disabled={mode === "sending"}
                className="h-12 rounded-lg bg-gold text-on-accent font-semibold flex items-center justify-center gap-2 disabled:opacity-70">
                {mode === "sending"
                  ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> {shrink !== null ? L(`מכווץ… ${Math.round(shrink * 100)}%`, `Compressing… ${Math.round(shrink * 100)}%`) : L("שולח…", "Sending…")}</>
                  : <><Send className="w-4 h-4" aria-hidden /> {t("rec.sendTape")}</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Sent ── */}
        {mode === "sent" && (
          <div className="sheet rounded-xl p-6 text-center space-y-3" role="status">
            <CheckCircle2 className="w-12 h-12 mx-auto text-sage" />
            <h2 className="font-display text-2xl">{L("הטייפ נשלח!", "Tape sent!")}</h2>
            <p className="text-sm text-text-muted">
              {sendResult === "cloud"
                ? L("המלהק/ת יכול/ה לצפות בו עכשיו. נעדכן אותך כשתהיה תשובה.", "The casting team can watch it now. We'll let you know when they respond.")
                : L("הטייפ נשמר במכשיר הזה. התחברו לחשבון כדי שיעלה לענן ויגיע למלהק/ת.", "Saved on this device. Sign in so it uploads and reaches the casting team.")}
            </p>
            <button onClick={() => router.replace("/inbox")} className="w-full h-12 rounded-lg bg-gold text-on-accent font-semibold">
              {L("חזרה לאודישנים", "Back to auditions")}
            </button>
          </div>
        )}

        {/* ── Sides & Aria (always reachable, below the camera) ── */}
        {mode !== "sent" && hasSides && (
          <section className="sheet rounded-xl">
            <button onClick={() => setShowSides((v) => !v)} aria-expanded={showSides}
              className="w-full flex items-center justify-between px-4 h-12 font-semibold">
              <span className="flex items-center gap-2"><ScrollText className="w-4 h-4" aria-hidden /> {L("סיידס והוראות", "Sides & instructions")}</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showSides && "rotate-180")} aria-hidden />
            </button>
            {showSides && (
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-3 max-h-[40dvh] overflow-y-auto">
                {role.sidesFile && <SidesFileViewer file={role.sidesFile} />}
                {role.selfTapeInstructions && (
                  <div>
                    <div className="text-xs font-bold text-text-muted mb-1">{t("rec.instructions")}</div>
                    <p className="text-sm leading-relaxed">{role.selfTapeInstructions}</p>
                  </div>
                )}
                {role.sides && (
                  <div>
                    <div className="text-xs font-bold text-text-muted mb-1">{t("rec.sides")}</div>
                    <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{role.sides}</pre>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {mode !== "sent" && (
          <div className="grid gap-2">
            <button
              onClick={async () => { if (!coaching) await loadCoaching(); setCoachingOpen((o) => !o); }}
              aria-expanded={coachingOpen}
              className="w-full h-11 rounded-lg border border-border bg-bg-elevated text-sm font-semibold inline-flex items-center justify-center gap-2">
              {coachingLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> {t("rec.ariaPreparing")}</>
                : <><Sparkles className="w-4 h-4" aria-hidden /> {coaching ? `${coachingOpen ? t("rec.hide") : t("rec.show")} ${t("rec.ariaDirections")}` : t("rec.askAria")}</>}
            </button>
            {coachingOpen && coaching && (
              <div className="rounded-lg bg-hi-soft border border-border p-3 text-sm leading-relaxed whitespace-pre-wrap">{coaching}</div>
            )}
            {(role.sides || role.sidesFile) && (
              <button onClick={practiceWithAria} className="w-full h-11 rounded-lg border border-border text-sm font-semibold inline-flex items-center justify-center gap-2">
                <Wand2 className="w-4 h-4" aria-hidden /> {t("rec.practiceAria")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
