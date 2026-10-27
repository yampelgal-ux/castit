"use client";

// Supabase Storage (bucket "media") for self-tapes, sides files and avatars.
// Object keys are long random tokens, so links behave like unlisted URLs.

import { supabase } from "@/lib/supabase";
import { SUPABASE_URL, isCloudConfigured } from "./config";
import { currentSyncUser } from "./sync";

const BUCKET = "media";

export function mediaPublicUrl(path: string): string | null {
  if (!isCloudConfigured()) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Upload (best-effort). Only signed-in users can upload; guests stay local. */
export async function uploadMedia(path: string, blob: Blob): Promise<string | null> {
  if (!isCloudConfigured() || !currentSyncUser()) return null;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: blob.type || undefined,
    cacheControl: "31536000",
  });
  if (error) { console.warn("[media] upload failed", path, error.message); return null; }
  return mediaPublicUrl(path);
}

/** Download a previously uploaded object (e.g. on another device). */
export async function downloadMedia(path: string): Promise<Blob | null> {
  const url = mediaPublicUrl(path);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
