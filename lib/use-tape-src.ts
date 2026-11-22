"use client";
import { useEffect, useState } from "react";
import { getTapePlaybackUrl } from "@/lib/tape-storage";

/**
 * A playable URL for a tape on any device: this device's copy when it has
 * one, otherwise the cloud copy. The stored videoUrl is often a blob: URL
 * that only ever worked on the talent's phone, so never rely on it alone.
 */
export function useTapeSrc(tape: { videoUrl?: string; tapeBlobKey?: string } | null | undefined): string | undefined {
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
      setSrc(r.url ?? undefined);
    });
    return () => { alive = false; revoke?.(); };
  }, [videoUrl, blobKey]);
  return src;
}
