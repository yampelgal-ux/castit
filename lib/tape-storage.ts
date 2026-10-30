// IndexedDB wrapper for self-tape video blobs.
// Keeps videos out of localStorage (quota) and gives them persistence
// across reloads / sessions.

import { uploadMedia, downloadMedia, mediaPublicUrl } from "@/lib/cloud/media";

const DB_NAME = "castit_tapes";
const STORE = "videos";
const VERSION = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") { reject(new Error("not in browser")); return; }
    const req = window.indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveTapeVideoLocal(key: string, blob: Blob): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function loadTapeVideoLocal(key: string): Promise<Blob | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => { db.close(); resolve((req.result as Blob) ?? null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function deleteTapeVideo(key: string): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// Resolve a playable URL for a tape. If the stored videoUrl is a blob:
// URL from a different session it'll be dead, so prefer IDB key.
export async function getTapePlaybackUrl(opts: {
  videoUrl?: string;
  blobKey?: string;
}): Promise<{ url: string | null; revoke?: () => void }> {
  if (opts.blobKey) {
    try {
      const blob = await loadTapeVideoLocal(opts.blobKey);
      if (blob) {
        const url = URL.createObjectURL(blob);
        return { url, revoke: () => URL.revokeObjectURL(url) };
      }
    } catch {
      // fall through
    }
    // Not on this device (pro watching a talent's tape, director link…) —
    // stream it straight from cloud storage.
    const cloud = mediaPublicUrl(`tapes/${opts.blobKey}`);
    if (cloud) return { url: cloud };
  }
  if (opts.videoUrl && !opts.videoUrl.startsWith("blob:")) {
    return { url: opts.videoUrl };
  }
  // blob: URL from a previous session — likely dead, but try anyway
  return { url: opts.videoUrl ?? null };
}

export function newTapeKey(submissionId: string): string {
  return `tape_${submissionId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Cloud-aware API (IndexedDB first, Supabase Storage as the shared copy) ──

/**
 * Save on this device and upload to the cloud so other devices/accounts can
 * open it. Resolves once the upload finished: "cloud" when it reached Storage,
 * "local" when it only lives on this device (guest / offline / no backend).
 */
export async function saveTapeVideo(key: string, blob: Blob): Promise<"cloud" | "local"> {
  let savedLocally = true;
  try { await saveTapeVideoLocal(key, blob); } catch (e) { savedLocally = false; console.warn("[tapes] local save failed", e); }
  const url = await uploadMedia(`tapes/${key}`, blob);
  if (url) return "cloud";
  if (!savedLocally) throw new Error("The video could not be saved. Check free space and your connection, then try again.");
  return "local";
}

/** Load from this device; if missing (other device / other account), fetch from the cloud and cache. */
export async function loadTapeVideo(key: string): Promise<Blob | null> {
  let local: Blob | null = null;
  try { local = await loadTapeVideoLocal(key); } catch { local = null; }
  if (local) return local;
  const remote = await downloadMedia(`tapes/${key}`);
  if (remote) { try { await saveTapeVideoLocal(key, remote); } catch {} }
  return remote;
}
