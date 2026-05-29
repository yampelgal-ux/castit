// IndexedDB wrapper for self-tape video blobs.
// Keeps videos out of localStorage (quota) and gives them persistence
// across reloads / sessions.

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

export async function saveTapeVideo(key: string, blob: Blob): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadTapeVideo(key: string): Promise<Blob | null> {
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
      const blob = await loadTapeVideo(opts.blobKey);
      if (blob) {
        const url = URL.createObjectURL(blob);
        return { url, revoke: () => URL.revokeObjectURL(url) };
      }
    } catch {
      // fall through to videoUrl
    }
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
