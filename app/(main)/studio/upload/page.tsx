"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Upload, Film, X, Check, AlertCircle, Camera, Image as ImageIcon } from "lucide-react";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { uploadReel } from "@/lib/db";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export default function UploadReelPage() {
  const router = useRouter();
  const { userId } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setError("Only video files are supported.");
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setError("Max file size is 100MB.");
      return;
    }
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    haptic("light");
  }

  async function submit() {
    if (!file || state === "uploading") return;
    setState("uploading");
    setProgress(0);

    // Fake smooth progress while waiting (Supabase JS doesn't expose stream progress)
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12, 92));
    }, 300);

    const { error: upError } = await uploadReel(file, userId ?? "anon", caption);
    clearInterval(interval);
    setProgress(100);

    if (upError) {
      setState("error");
      setError(upError);
      haptic("error");
      return;
    }
    setState("done");
    haptic("success");
    setTimeout(() => router.push("/profile/me"), 1200);
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
      <Header back title="New reel" />

      <div className="flex-1 px-5 pt-4 pb-6 flex flex-col">
        {!file ? (
          <div className="flex-1 flex flex-col gap-3">
            <div className="text-center mb-2">
              <p className="font-display text-2xl tracking-editorial">איך תרצה ליצור את הריל?</p>
              <p className="text-xs text-text-muted mt-1">MP4 / MOV · עד 100MB · מומלץ פורמט אנכי</p>
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
                <div className="text-[11px] text-text-muted">פתיחת מצלמת הטלפון להקלטה ישירה</div>
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
                <div className="text-[11px] text-text-muted">סרטון שכבר צילמת — במכשיר או ב-Cloud</div>
              </div>
            </button>

            <div className="text-[10px] text-text-subtle text-center mt-3 leading-relaxed">
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
              {state === "uploading" && (
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                  <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <motion.div
                      className="h-full bg-gold rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[11px] text-white/80 mt-2 tnum">{Math.round(progress)}% uploaded</p>
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
                    <Check className="w-10 h-10 text-bg" strokeWidth={3} />
                  </motion.div>
                </div>
              )}
            </div>

            <div className="mt-5">
              <label className="text-[10px] uppercase tracking-wider text-text-muted">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={state !== "idle"}
                placeholder="Tell people what this is…"
                rows={3}
                className="mt-1.5 w-full px-4 py-3 rounded-2xl bg-bg-elevated border border-border outline-none text-sm focus:border-gold/40 resize-none disabled:opacity-60"
              />
              <div className="text-[10px] text-text-subtle text-right mt-1 tnum">{caption.length}/280</div>
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
            disabled={!file || state !== "idle"}
            className={cn(
              "w-full h-13 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all",
              file && state === "idle"
                ? "bg-gold text-bg"
                : state === "done"
                ? "bg-success text-bg"
                : "bg-bg-elevated text-text-subtle"
            )}
          >
            {state === "uploading" && "Uploading…"}
            {state === "done" && (<><Check className="w-4 h-4" /> Posted!</>)}
            {state === "error" && "Try again"}
            {state === "idle" && (<><Film className="w-4 h-4" /> Post reel</>)}
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
