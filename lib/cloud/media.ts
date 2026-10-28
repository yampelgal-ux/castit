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

let lastError = "";
/** Why the most recent upload didn't reach the cloud ("" when it did). */
export function lastUploadError(): string { return lastError; }

/** Upload (best-effort). Only signed-in users can upload; guests stay local. */
export async function uploadMedia(path: string, blob: Blob): Promise<string | null> {
  lastError = "";
  if (!isCloudConfigured()) { lastError = "no-backend"; return null; }
  if (!currentSyncUser()) {
    // Sync may still be starting; what Storage needs is a live auth session.
    const { data } = await supabase.auth.getSession();
    if (!data.session) { lastError = "signed-out"; return null; }
  }
  // No upsert: Storage then also demands SELECT/UPDATE rights on the object,
  // which the media bucket's policies don't grant. Every key here is unique,
  // so a plain insert is enough; "already exists" means it's already there.
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: false,
    contentType: blob.type || undefined,
    cacheControl: "31536000",
  });
  if (error && /exists|duplicate/i.test(error.message)) return mediaPublicUrl(path);
  if (error) {
    console.warn("[media] upload failed", path, error.message);
    lastError = /size|large|413|maximum/i.test(error.message) ? "too-large" : error.message || "failed";
    return null;
  }
  return mediaPublicUrl(path);
}

/** Remove an object this user uploaded (best-effort). */
export async function removeMedia(path: string): Promise<void> {
  if (!isCloudConfigured()) return;
  try { await supabase.storage.from(BUCKET).remove([path]); } catch {}
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
