"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Trash2, Download, AlertCircle,
  Calendar, FileVideo, Sparkles, ChevronRight,
} from "lucide-react";
import { Header } from "@/components/Header";
import {
  getScene, takesForScene, deleteTake, deleteScene,
  type SavedScene, type Take,
} from "@/lib/coach-store";
import { loadAudio, deleteAudio } from "@/lib/coach-recordings";

const VOICE_LABELS: Record<string, string> = {
  man: "גבר", woman: "אישה",
  boy: "ילד", girl: "ילדה",
  old_man: "זקן", old_woman: "זקנה",
  teen_male: "נער", teen_female: "נערה",
};
const TONE_LABELS: Record<string, string> = {
  neutral: "נייטרלי", excited: "נרגש", happy: "שמח", sad: "עצוב",
  scared: "מפוחד", worried: "מודאג", angry: "כועס", tender: "רך",
  sarcastic: "ציני", tense: "מתוח", flirtatious: "מפלרטט", cold: "קר",
};

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + ", " +
         d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function ScenePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [scene, setScene] = useState<SavedScene | null | undefined>(undefined);
  const [takes, setTakes] = useState<Take[]>([]);

  useEffect(() => {
    if (!id) return;
    const s = getScene(id);
    setScene(s ?? null);
    if (s) setTakes(takesForScene(id));
  }, [id]);

  function refreshTakes() {
    if (id) setTakes(takesForScene(id));
  }

  async function handleDeleteScene() {
    if (!scene) return;
    if (!confirm(`למחוק את "${scene.title}" וכל הטייקים?`)) return;
    // Delete all blobs
    for (const t of takes) {
      try { await deleteAudio(t.id); } catch {}
    }
    deleteScene(scene.id);
    router.push("/studio/coach/library");
  }

  if (scene === undefined) {
    return <div className="min-h-dvh bg-bg" />;
  }
  if (!scene) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="לא נמצא" />
        <div className="px-4 mt-10 text-center">
          <AlertCircle className="w-10 h-10 text-text-subtle mx-auto opacity-60" />
          <p className="text-sm text-text-muted mt-3">הסצנה לא נמצאה.</p>
          <Link href="/studio/coach/library" className="inline-block mt-4 text-gold text-sm font-semibold">
            ← חזור לספרייה
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg pb-12">
      <Header
        back
        title={scene.title}
        right={
          <button onClick={handleDeleteScene} className="text-[11px] text-danger">
            <Trash2 className="w-4 h-4" />
          </button>
        }
      />

      {/* Practice CTA */}
      <div className="px-4 mt-3">
        <Link
          href="/studio/coach"
          onClick={() => {
            // Stash scene id for the coach page to pick up
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem("castit_coach_resume_scene", scene.id);
            }
          }}
          className="block w-full h-12 rounded-full bg-gold text-bg font-semibold text-sm inline-flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" /> תרגל סצנה זו שוב
        </Link>
      </div>

      {/* Scene metadata */}
      <div className="px-4 mt-5">
        {scene.summary && (
          <p className="text-xs text-text-muted leading-relaxed">{scene.summary}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {scene.characters.map((c) => (
            <span
              key={c}
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                c === scene.yourCharacter
                  ? "bg-gold/15 text-gold border border-gold/30 font-semibold"
                  : "bg-bg-elevated border border-border text-text-muted"
              }`}
            >
              {c}{c === scene.yourCharacter ? " · אני" : ""}
            </span>
          ))}
        </div>
        <div className="text-[10px] text-text-subtle mt-2 tnum">
          {scene.lines.length} שורות
        </div>
      </div>

      {/* Script preview */}
      <div className="px-4 mt-5">
        <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2">סקריפט</div>
        <div className="rounded-2xl bg-bg-elevated border border-border p-3 space-y-2 max-h-64 overflow-y-auto">
          {scene.lines.map((l, i) => (
            <div key={i} className="text-xs leading-relaxed">
              <span className={`font-semibold ${l.character === scene.yourCharacter ? "text-gold" : "text-text-muted"}`}>
                {l.character}:
              </span>{" "}
              <span className="text-text">{l.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Takes */}
      <div className="px-4 mt-6">
        <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2 inline-flex items-center gap-1.5">
          <FileVideo className="w-3 h-3" /> טייקים ({takes.length})
        </div>
        {takes.length === 0 ? (
          <div className="text-xs text-text-muted py-4 text-center">
            עדיין לא הקלטת. הפעל הקלטה בעמוד התרגול (אייקון הדיסק).
          </div>
        ) : (
          <div className="space-y-2">
            {takes.map((t, i) => (
              <TakeRow key={t.id} take={t} index={i + 1} onDelete={refreshTakes} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TakeRow({ take, index, onDelete }: { take: Take; index: number; onDelete: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  async function togglePlay() {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    if (!url) {
      setLoading(true);
      try {
        const blob = await loadAudio(take.id);
        if (!blob) { setLoading(false); return; }
        const u = URL.createObjectURL(blob);
        setUrl(u);
        // Wait for next render
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = u;
            audioRef.current.play();
            setPlaying(true);
          }
        }, 50);
      } finally {
        setLoading(false);
      }
    } else {
      audioRef.current?.play();
      setPlaying(true);
    }
  }

  async function download() {
    let u = url;
    if (!u) {
      const blob = await loadAudio(take.id);
      if (!blob) return;
      u = URL.createObjectURL(blob);
      setUrl(u);
    }
    const a = document.createElement("a");
    a.href = u;
    a.download = `take-${index}-${take.recordedAt.slice(0, 10)}${take.audioMime.includes("mp4") ? ".m4a" : ".webm"}`;
    a.click();
  }

  async function handleDelete() {
    if (!confirm("למחוק טייק זה?")) return;
    try { await deleteAudio(take.id); } catch {}
    deleteTake(take.id);
    onDelete();
  }

  return (
    <div className="rounded-2xl bg-bg-elevated border border-border p-3 flex items-center gap-3">
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-gold text-bg grid place-items-center shrink-0 disabled:opacity-50"
        disabled={loading}
        aria-label={playing ? "השהה" : "נגן"}
      >
        {loading ? (
          <div className="w-3 h-3 border-2 border-bg border-r-transparent rounded-full animate-spin" />
        ) : playing ? (
          <Pause className="w-4 h-4 fill-bg" />
        ) : (
          <Play className="w-4 h-4 fill-bg" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">טייק {index}</div>
        <div className="text-[10px] text-text-muted mt-0.5 truncate">
          {formatDate(take.recordedAt)} · {formatDuration(take.durationMs)}
        </div>
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold/15 text-gold font-semibold">
            {VOICE_LABELS[take.partnerVoice] ?? take.partnerVoice}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-plum/15 text-plum-light font-semibold">
            {TONE_LABELS[take.partnerTone] ?? take.partnerTone}
          </span>
        </div>
      </div>
      <button
        onClick={download}
        className="w-8 h-8 rounded-full hover:bg-bg grid place-items-center text-text-muted"
        aria-label="הורד"
      >
        <Download className="w-4 h-4" />
      </button>
      <button
        onClick={handleDelete}
        className="w-8 h-8 rounded-full hover:bg-bg grid place-items-center text-text-muted"
        aria-label="מחק"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <audio
        ref={audioRef}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        className="hidden"
      />
    </div>
  );
}
