"use client";
import { useEffect, useState } from "react";
import { getTapePlaybackUrl } from "@/lib/tape-storage";

/**
 * A playable URL for a tape on any device: this device's copy when it has
 * one, otherwise the cloud copy. The stored videoUrl is often a blob: URL
 * that only ever worked on the talent's phone, so never rely on it alone.
 */
export function useTapeSrc(tape: { videoUrl?: string; tapeBlobKey?: string; trimStart?: number; trimEnd?: number } | null | undefined): string | undefined {
  const videoUrl = tape?.videoUrl;
  const blobKey = tape?.tapeBlobKey;
  const [src, setSrc] = useState<string | undefined>(() =>
    videoUrl && !videoUrl.startsWith("blob:") && !blobKey ? videoUrl : undefined,
  );
  useEffect(() => {
    let alive = true;
    let revoke: (() => void) | undefined;
    if (!videoUrl && !blobKey) { setSrc(undefined); return; }
    getTapePlaybackUrl({ videoUrl, blobKey }).then((r) => {
      if (!alive) { r.revoke?.(); return; }
      revoke = r.revoke;
      setSrc(r.url ? r.url + trimFragment(tape?.trimStart, tape?.trimEnd) : undefined);
    });
    return () => { alive = false; revoke?.(); };
  }, [videoUrl, blobKey, tape?.trimStart, tape?.trimEnd]);
  return src;
}

/** Media fragment (#t=start,end): every browser then plays only that part. */
export function trimFragment(start?: number, end?: number): string {
  if (!start && !end) return "";
  const a = Math.max(0, Math.round((start ?? 0) * 10) / 10);
  return end ? `#t=${a},${Math.round(end * 10) / 10}` : `#t=${a}`;
}
