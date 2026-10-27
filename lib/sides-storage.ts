// IndexedDB store for sides attachments (PDF / DOC / TXT files attached
// to a role by the casting pro, downloaded by the talent).

import { uploadMedia, downloadMedia } from "@/lib/cloud/media";

const DB_NAME = "castit_sides";
const STORE = "files";
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

async function saveSidesFileLocal(key: string, blob: Blob): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function loadSidesFileLocal(key: string): Promise<Blob | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => { db.close(); resolve((req.result as Blob) ?? null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function deleteSidesFile(key: string): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export function newSidesKey(roleId: string): string {
  return `sides_${roleId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Trigger a browser download for a sides file by key.
export async function downloadSidesFile(key: string, filename: string): Promise<void> {
  const blob = await loadSidesFile(key);
  if (!blob) {
    alert("הקובץ לא נמצא — ייתכן שהמלהק עדיין לא העלה את הסיידס.");
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ── Cloud-aware API (IndexedDB first, Supabase Storage as the shared copy) ──

/** Save on this device and upload to the cloud so other devices/accounts can open it. */
export async function saveSidesFile(key: string, blob: Blob): Promise<void> {
  await saveSidesFileLocal(key, blob);
  void uploadMedia(`sides/${key}`, blob);
}

/** Load from this device; if missing (other device / other account), fetch from the cloud and cache. */
export async function loadSidesFile(key: string): Promise<Blob | null> {
  let local: Blob | null = null;
  try { local = await loadSidesFileLocal(key); } catch { local = null; }
  if (local) return local;
  const remote = await downloadMedia(`sides/${key}`);
  if (remote) { try { await saveSidesFileLocal(key, remote); } catch {} }
  return remote;
}
