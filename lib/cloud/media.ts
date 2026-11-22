"use client";

// Supabase Storage (bucket "media") for self-tapes, sides files and avatars.
// Object keys are long random tokens, so links behave like unlisted URLs.

import { supabase } from "@/lib/supabase";
import { SUPABASE_URL, isCloudConfigured } from "./config";

const BUCKET = "media";

export function mediaPublicUrl(path: string): string | null {
  if (!isCloudConfigured()) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Start of every public media URL; what follows is the object path. */
export function SUPABASE_PUBLIC_PREFIX(): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
}

let lastError = "";
/** Why the most recent upload didn't reach the cloud ("" when it did). */
export function lastUploadError(): string { return lastError; }

/** Supabase Storage on the free plan accepts files up to 50MB. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

type UploadOpts = { onProgress?: (fraction: number) => void };

/** One upload over XHR, so we get real progress (supabase-js doesn't report it). */
function putOnce(url: string, blob: Blob, token: string, anon: string, onProgress?: (f: number) => void): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", anon);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    if (blob.type) xhr.setRequestHeader("Content-Type", blob.type);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText || "" });
    xhr.onerror = () => resolve({ status: 0, body: "network" });
    xhr.ontimeout = () => resolve({ status: 0, body: "timeout" });
    // Generous: a 50MB file on a slow mobile uplink can take several minutes.
    xhr.timeout = 15 * 60 * 1000;
    xhr.send(blob);
  });
}

/**
 * Upload (best-effort). Only signed-in users can upload; guests stay local.
 * Retries network drops and server hiccups; reports real progress.
 */
export async function uploadMedia(path: string, blob: Blob, opts: UploadOpts = {}): Promise<string | null> {
  lastError = "";
  if (!isCloudConfigured()) { lastError = "no-backend"; return null; }
  if (blob.size > MAX_UPLOAD_BYTES) { lastError = "too-large"; return null; }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) { lastError = "signed-out"; return null; }
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
  // No upsert: Storage then also demands SELECT/UPDATE rights on the object,
  // which the media bucket's policies don't grant. Every key here is unique,
  // so a plain insert is enough; "already exists" means it's already there.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * attempt));
    const { status, body } = await putOnce(url, blob, token, anon, opts.onProgress);
    if (status >= 200 && status < 300) { opts.onProgress?.(1); return mediaPublicUrl(path); }
    if (/exists|duplicate/i.test(body) || status === 409) return mediaPublicUrl(path);
    if (status === 413 || /size|too large|maximum/i.test(body)) { lastError = "too-large"; return null; }
    if (status === 401 || status === 403) {
      console.warn("[media] upload refused", path, status, body);
      lastError = "not-allowed";
      return null;
    }
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      console.warn("[media] upload rejected", path, status, body);
      lastError = `failed (${status})`;
      return null;
    }
    // 0 (offline / dropped), 5xx, 408, 429: try again.
    console.warn("[media] upload attempt failed", attempt + 1, path, status, body);
    lastError = status === 0 ? "network" : `failed (${status})`;
  }
  return null;
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
