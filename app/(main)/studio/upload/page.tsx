"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Upload, Film, X, Check, AlertCircle, Camera, Image as ImageIcon } from "lucide-react";
import { Header } from "@/components/Header";
import { useMyReels, MAX_REEL_BYTES } from "@/lib/reels-store";
import { lastUploadError } from "@/lib/cloud/media";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { canCompress, compressVideo, videoDuration, MAX_REEL_SECONDS } from "@/lib/video-compress";

// Big files are fine when we can shrink them on the phone before upload.
const MAX_PICK_BYTES = 400 * 1024 * 1024;

export default function UploadReelPage() {
  const router = useRouter();
  const addReel = useMyReels((s) => s.add);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<"idle" | "compressing" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setError("אפשר להעלות רק קובצי וידאו (MP4, MOV).");
      return;
    }
    if (f.size > (canCompress() ? MAX_PICK_BYTES : MAX_REEL_BYTES)) {
      setError(`הקובץ גדול מ-${MAX_REEL_BYTES / 1048576}MB. כדאי לקצר אותו או לייצא באיכות נמוכה יותר ולנסות שוב.`);
      return;
    }
    if ((await videoDuration(f)) > MAX_REEL_SECONDS + 0.5) {
      setError(`הסרטון ארוך מ-${MAX_REEL_SECONDS} שניות. כדאי לקצר אותו ולנסות שוב.`);
      return;
    }
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    haptic("light");
  }

  async function submit() {
    if (!file || state === "uploading" || state === "compressing" || state === "done") return;
    setError("");
    setProgress(0);

    // Shrink 4K phone videos to 720p first, so storage lasts and viewers load faster.
    setState("compressing");
    const small = await compressVideo(file, { onProgress: (p) => setProgress(p * 100) });
    if (small.size > MAX_REEL_BYTES) {
      setState("error");
      setError(`גם אחרי כיווץ הסרטון גדול מ-${MAX_REEL_BYTES / 1048576}MB. כדאי לקצר אותו ולנסות שוב.`);
      return;
    }
    setState("uploading");
    setProgress(0);

    // Fake smooth progress while waiting (Supabase JS doesn't expose stream progress)
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12, 92));
    }, 300);

    let upError: string | null = null;
    let onlyLocal = false;
    try {
      const reel = await addReel(small, caption);
      onlyLocal = !reel.cloud;
    } catch (e) {
      upError = e instanceof Error ? e.message : "ההעלאה נכשלה. נסו שוב.";
    }
    clearInterval(interval);
    setProgress(100);

    if (upError) {
      setState("error");
      setError(upError);
      haptic("error");
      return;
    }
    setState("done");
    haptic(onlyLocal ? "error" : "success");
    if (onlyLocal) {
      const why = lastUploadError();
      setError(
        why === "signed-out" ? "הסרטון נשמר רק במכשיר הזה כי לא התחברת לחשבון. התחברי ואז לחצי \"פרסום\" ליד הסרטון בהגדרות."
        : why === "too-large" ? "הסרטון נשמר רק במכשיר הזה כי הוא גדול מדי לענן. כדאי לקצר אותו ולהעלות שוב."
        : `הסרטון נשמר במכשיר, אבל ההעלאה לענן לא הצליחה, אז אחרים עוד לא רואים אותו. אפשר לנסות שוב מההגדרות. (${why || "unknown"})`,
      );
      setTimeout(() => router.push("/settings#videos"), 4000);
      return;
    }
    setTimeout(() => router.push("/settings#videos"), 1200);
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setProgress(0);
    setState("idle");
    setError("");
  }

  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      <Header back title="סרטון חדש" />

      <div className="flex-1 px-5 pt-4 pb-6 flex flex-col">
        {!file ? (
          <div className="flex-1 flex flex-col gap-3">
            <div className="text-center mb-2">
              <p className="font-display text-2xl tracking-editorial">איך תרצה ליצור את הריל?</p>
              <p className="text-xs text-text-muted mt-1">{`MP4 / MOV · עד ${MAX_REEL_SECONDS} שניות · מומלץ פורמט אנכי`}</p>
            </div>

            {/* Option 1: Camera — opens phone camera directly */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="rounded-3xl bg-gradient-to-br from-gold/15 to-bg-elevated border border-gold/30 p-5 flex items-center gap-4 text-right active:scale-[0.99] transition-transform"
            >
              <div className="w-14 h-14 rounded-2xl bg-gold/20 grid place-items-center shrink-0">
                <Camera className="w-7 h-7 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg">צלם עם המצלמה</div>
                <div className="text-[0.6875rem] text-text-muted">פתיחת מצלמת הטלפון להקלטה ישירה</div>
              </div>
            </button>

            {/* Option 2: Gallery / Files — native picker */}
            <button
              onClick={() => inputRef.current?.click()}
              className="rounded-3xl bg-bg-elevated border border-border p-5 flex items-center gap-4 text-right active:scale-[0.99] transition-transform"
            >
              <div className="w-14 h-14 rounded-2xl bg-plum/15 grid place-items-center shrink-0">
                <ImageIcon className="w-7 h-7 text-plum-light" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg">בחר מהגלריה / קבצים</div>
                <div className="text-[0.6875rem] text-text-muted">סרטון שכבר צילמת — במכשיר או ב-Cloud</div>
              </div>
            </button>

            <div className="text-[0.6875rem] text-text-subtle text-center mt-3 leading-relaxed">
              צילמת במצלמה מקצועית? בחר "גלריה / קבצים" והעלה את ה-MP4 הסופי.
            </div>
          </div>
        ) : (
          <>
            <div className="relative aspect-[9/16] max-h-[55vh] mx-auto rounded-3xl overflow-hidden bg-black">
              {preview && <video src={preview} autoPlay muted loop playsInline className="w-full h-full object-cover" />}
              {state === "idle" && (
                <button
                  onClick={reset}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}
              {(state === "uploading" || state === "compressing") && (
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                  <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <motion.div
                      className="h-full bg-gold rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[0.6875rem] text-white/80 mt-2 tnum">{state === "compressing" ? `מכווץ לאיכות שמתאימה לטלפון… ${Math.round(progress)}%` : `${Math.round(progress)}% הועלה`}</p>
                </div>
              )}
              {state === "done" && (
                <div className="absolute inset-0 bg-black/60 grid place-items-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="w-20 h-20 rounded-full bg-success grid place-items-center"
                  >
                    <Check className="w-10 h-10 text-on-accent" strokeWidth={3} />
                  </motion.div>
                </div>
              )}
            </div>

            <div className="mt-5">
              <label className="text-[0.6875rem] uppercase tracking-wider text-text-muted">כיתוב</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={state === "uploading" || state === "compressing" || state === "done"}
                aria-label="כיתוב לסרטון"
                placeholder="ספרי מה רואים בסרטון…"
                rows={3}
                className="mt-1.5 w-full px-4 py-3 rounded-2xl bg-bg-elevated border border-border outline-none text-sm focus:border-gold/40 resize-none disabled:opacity-60"
              />
              <div className="text-[0.6875rem] text-text-subtle text-right mt-1 tnum">{caption.length}/280</div>
            </div>
          </>
        )}

        {error && (
          <div className="flex items-start gap-2 mt-3 text-terra text-xs px-1">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-auto pt-5">
          <button
            onClick={submit}
            disabled={!file || state === "uploading" || state === "compressing" || state === "done"}
            className={cn(
              "w-full h-13 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all",
              file && (state === "idle" || state === "error")
                ? "bg-gold text-on-accent"
                : state === "done"
                ? "bg-success text-on-accent"
                : "bg-bg-elevated text-text-subtle"
            )}
          >
            {state === "compressing" && "מכווץ…"}
            {state === "uploading" && "מעלה…"}
            {state === "done" && (<><Check className="w-4 h-4" /> נשמר!</>)}
            {state === "error" && "לנסות שוב"}
            {state === "idle" && (<><Film className="w-4 h-4" /> פרסום הסרטון</>)}
          </button>
        </div>
      </div>

      {/* Gallery / files — no capture attribute, opens native picker */}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={onPick}
        className="hidden"
      />
      {/* Camera — capture attribute forces the phone camera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />
    </div>
  );
}
