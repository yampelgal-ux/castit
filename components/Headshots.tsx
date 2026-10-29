"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X, ChevronLeft, ChevronRight, Trash2, Star } from "lucide-react";
import { PhotoPicker } from "@/components/PhotoPicker";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { photoToDataUrl } from "@/lib/image";
import { dataUrlToBlob, removeMedia, uploadMedia, SUPABASE_PUBLIC_PREFIX } from "@/lib/cloud/media";
import { isCloudConfigured, isRealUserId } from "@/lib/cloud/config";
import { haptic } from "@/lib/haptics";

export const MAX_HEADSHOTS = 6;
const NONE: string[] = [];

/** Upload a picked photo; falls back to a data URL on this device when offline or in demo. */
async function storePhoto(file: File, userId: string | null): Promise<string> {
  const dataUrl = await photoToDataUrl(file, 1400, 0.86);
  if (!isCloudConfigured() || !isRealUserId(userId)) return dataUrl;
  const url = await uploadMedia(`headshots/${userId}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.jpg`, await dataUrlToBlob(dataUrl));
  return url || dataUrl;
}

function forget(url: string) {
  if (url.startsWith(SUPABASE_PUBLIC_PREFIX())) void removeMedia(decodeURIComponent(url.slice(SUPABASE_PUBLIC_PREFIX().length)));
}

/** The signed-in talent's own headshots: add, remove, make one the profile photo. */
export function MyHeadshots() {
  const { lang } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const userId = useStore((s) => s.userId);
  const photos = useStore((s) => s.profile.headshots ?? NONE);
  const setProfile = useStore((s) => s.setProfile);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  async function add(file: File) {
    setErr(""); setBusy(true);
    try {
      const url = await storePhoto(file, userId);
      const cur = useStore.getState().profile.headshots ?? [];
      setProfile({ headshots: [...cur, url].slice(0, MAX_HEADSHOTS) });
      haptic("success");
    } catch {
      setErr(L("לא הצלחנו לקרוא את התמונה. נסו קובץ JPG או PNG.", "Couldn't read that image. Try a JPG or PNG."));
    }
    setBusy(false);
  }
  function remove(i: number) {
    const cur = useStore.getState().profile.headshots ?? [];
    forget(cur[i]);
    setProfile({ headshots: cur.filter((_, j) => j !== i) });
    setOpen(null);
  }
  function makeMain(i: number) {
    setProfile({ photoUrl: photos[i] });
    haptic("light");
    setOpen(null);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((src, i) => (
          <button key={src.slice(-40) + i} onClick={() => setOpen(i)} className="aspect-[3/4] rounded-xl overflow-hidden bg-bg-elevated"
            aria-label={L(`תמונה ${i + 1}`, `Photo ${i + 1}`)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
        {photos.length < MAX_HEADSHOTS && (
          <PhotoPicker onPick={add} cameraFacing="environment" title={L("הוספת תמונה", "Add a photo")}
            className="aspect-[3/4] rounded-xl border-2 border-dashed border-border-strong grid place-items-center text-text-muted">
            <span className="flex flex-col items-center gap-1 text-xs font-semibold">
              <Plus className="w-6 h-6" aria-hidden /> {busy ? L("מעלה…", "Uploading…") : L("הוספת תמונה", "Add photo")}
            </span>
          </PhotoPicker>
        )}
      </div>
      <p className="text-xs text-text-muted mt-2">
        {L(`עד ${MAX_HEADSHOTS} תמונות. מלהקים מחפשים בדרך כלל פנים מקרוב, גוף מלא ופרופיל, בלי פילטרים.`,
           `Up to ${MAX_HEADSHOTS} photos. Casting directors usually look for a close-up, a full-body shot and a profile, no filters.`)}
      </p>
      {err && <p className="text-xs text-terra mt-1" role="alert">{err}</p>}
      <Viewer photos={photos} index={open} onIndex={setOpen}
        actions={(i) => (
          <div className="flex gap-2">
            <button onClick={() => makeMain(i)} className="flex-1 h-11 rounded-full bg-white/15 text-white text-sm font-semibold flex items-center justify-center gap-2">
              <Star className="w-4 h-4" aria-hidden /> {L("תמונת פרופיל", "Set as profile photo")}
            </button>
            <button onClick={() => remove(i)} className="h-11 px-4 rounded-full bg-white/15 text-white text-sm font-semibold flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" aria-hidden /> {L("מחיקה", "Delete")}
            </button>
          </div>
        )} />
    </div>
  );
}

/** Someone else's headshots, read-only. */
export function HeadshotGrid({ photos, name }: { photos: string[]; name: string }) {
  const { lang } = useT();
  const he = lang === "he";
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) {
    return <p className="text-sm text-text-muted text-center py-8">{he ? "עוד אין תמונות." : "No photos yet."}</p>;
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((src, i) => (
          <button key={i} onClick={() => setOpen(i)} className="aspect-[3/4] rounded-2xl overflow-hidden bg-bg-elevated"
            aria-label={he ? `${name}, תמונה ${i + 1}` : `${name}, photo ${i + 1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      <Viewer photos={photos} index={open} onIndex={setOpen} />
    </>
  );
}

/** Full-screen photo viewer with previous / next and swipe. */
function Viewer({ photos, index, onIndex, actions }: {
  photos: string[]; index: number | null; onIndex: (i: number | null) => void; actions?: (i: number) => React.ReactNode;
}) {
  const { lang } = useT();
  const he = lang === "he";
  const n = photos.length;
  const go = (d: number) => index !== null && onIndex((index + d + n) % n);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onIndex(null);
      if (e.key === "ArrowRight") go(he ? -1 : 1);
      if (e.key === "ArrowLeft") go(he ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <AnimatePresence>
      {index !== null && photos[index] && (
        <motion.div key="viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          role="dialog" aria-modal="true" aria-label={he ? "תמונות" : "Photos"}
          className="fixed inset-0 z-[70] bg-black flex flex-col" dir="ltr">
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-sm tnum">{index + 1} / {n}</span>
            <button onClick={() => onIndex(null)} aria-label={he ? "סגירה" : "Close"} className="w-11 h-11 rounded-full grid place-items-center hover:bg-white/10">
              <X className="w-6 h-6" />
            </button>
          </div>
          <motion.div className="flex-1 relative grid place-items-center overflow-hidden"
            drag={n > 1 ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.4}
            onDragEnd={(_, info) => { if (info.offset.x < -60) go(1); else if (info.offset.x > 60) go(-1); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[index]} alt="" className="max-w-full max-h-full object-contain select-none pointer-events-none" />
            {n > 1 && (
              <>
                <button onClick={() => go(-1)} aria-label={he ? "הקודמת" : "Previous"} className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 text-white grid place-items-center">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button onClick={() => go(1)} aria-label={he ? "הבאה" : "Next"} className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 text-white grid place-items-center">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </motion.div>
          {actions && <div className="p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]" dir={he ? "rtl" : "ltr"}>{actions(index)}</div>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
