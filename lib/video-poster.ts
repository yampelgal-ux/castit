"use client";

// Cover images for videos: a JPEG of an early frame, so feeds and grids show
// a picture instead of a black box before the video loads.

import { useEffect, useState } from "react";

const FRAME_AT = 0.1; // seconds; frame 0 is often black on phone recordings

/** Grab a frame from a video (file or URL) as a JPEG. Null if the browser can't. */
export async function capturePoster(src: Blob | string, maxW = 540): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  if (typeof src === "string") v.crossOrigin = "anonymous";
  const objectUrl = typeof src === "string" ? null : URL.createObjectURL(src);
  v.src = objectUrl ?? (src as string);

  const once = (ev: string, ms: number) => new Promise<boolean>((res) => {
    const t = setTimeout(() => res(false), ms);
    v.addEventListener(ev, () => { clearTimeout(t); res(true); }, { once: true });
    v.addEventListener("error", () => { clearTimeout(t); res(false); }, { once: true });
  });

  try {
    // iPhones ignore preload on a video nobody plays; a muted play() makes it load.
    v.play().then(() => v.pause()).catch(() => {});
    if (v.readyState < 2 && !(await once("loadeddata", 10000))) return null;
    v.currentTime = Math.min(FRAME_AT, (v.duration || 1) / 2);
    if (!(await once("seeked", 5000))) return null;
    const w = Math.min(maxW, v.videoWidth || maxW);
    const h = Math.round(w * ((v.videoHeight || 16) / (v.videoWidth || 9)));
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, w, h);
    return await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.78));
  } catch {
    return null; // e.g. a cross-origin video without CORS taints the canvas
  } finally {
    v.removeAttribute("src");
    v.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

// Posters made on this device for videos that don't have a stored cover yet.
const cache = new Map<string, Promise<string | null>>();
let running = 0;
const waiting: (() => void)[] = [];

async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= 2) await new Promise<void>((r) => waiting.push(r));
  running++;
  try { return await fn(); } finally { running--; waiting.shift()?.(); }
}

function posterFor(videoUrl: string): Promise<string | null> {
  let p = cache.get(videoUrl);
  if (!p) {
    p = limited(() => capturePoster(videoUrl)).then((b) => (b ? URL.createObjectURL(b) : null));
    cache.set(videoUrl, p);
  }
  return p;
}

function imageLoads(url: string): Promise<boolean> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(true);
    img.onerror = () => res(false);
    img.src = url;
  });
}

/**
 * The cover to show for a video: the stored poster when it exists, otherwise
 * a frame grabbed from the video on this device.
 */
export function usePoster(videoUrl: string | null | undefined, stored?: string | null): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setUrl(undefined);
    if (!videoUrl && !stored) return;
    (async () => {
      if (stored && (await imageLoads(stored))) { if (alive) setUrl(stored); return; }
      if (!videoUrl) return;
      const made = await posterFor(videoUrl);
      if (alive && made) setUrl(made);
    })();
    return () => { alive = false; };
  }, [videoUrl, stored]);
  return url;
}

/** Where a cloud video's cover lives: next to it, under posters/. */
export function posterPathFor(blobKey: string): string {
  return `posters/${blobKey}.jpg`;
}
