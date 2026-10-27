"use client";

// ════════════════════════════════════════════════════════════════
// Cloud sync engine
// ────────────────────────────────────────────────────────────────
// Every store in CastIt keeps a synchronous localStorage API (fast, works
// offline). This module transparently mirrors those keys to Supabase
// (`user_kv`) for the signed-in account:
//   • write-through: any localStorage.setItem/removeItem on a synced key is
//     queued and pushed (debounced, retried when back online)
//   • pull on sign-in / app start, so the same account sees the same data on
//     every phone, tablet and computer
//   • realtime: edits made on another device arrive live
// Nothing changes for guests / demo mode — no account, no network.
// ════════════════════════════════════════════════════════════════

import { supabase } from "@/lib/supabase";
import { CLOUD_UID_KEY, isCloudConfigured } from "./config";
import type { RealtimeChannel } from "@supabase/supabase-js";

const PREFIX = "castit_";

// Device-local keys that must never travel between devices/accounts.
const LOCAL_ONLY = new Set<string>([
  CLOUD_UID_KEY,
  "castit_lang_v1",
  "castit_demo_seeded_v2",
  "castit_demo_badge_dismissed_v1",
  "castit_shared_meta_v1",
  "castit_coach_incoming_scene",
  "castit_coach_resume_scene",
  "castit_director_name",
  "castit_sync_dirty",
]);

// Keys changed on this device that the cloud hasn't confirmed yet. Persisted so
// an edit made right before the app closes (or while offline) is never
// overwritten by an older cloud copy on the next launch.
const DIRTY_KEY = "castit_sync_dirty";
function readDirty(): Set<string> {
  try { return new Set(JSON.parse(ls()?.getItem(DIRTY_KEY) || "[]")); } catch { return new Set(); }
}
function writeDirty(set: Set<string>) {
  const store = ls();
  if (!store) return;
  try {
    if (set.size) origSet.call(store, DIRTY_KEY, JSON.stringify([...set]));
    else origRemove.call(store, DIRTY_KEY);
  } catch {}
}
function markDirty(key: string) {
  const store = ls();
  if (!store || !store.getItem(CLOUD_UID_KEY)) return; // guests: nothing to sync
  const d = readDirty();
  if (!d.has(key)) { d.add(key); writeDirty(d); }
}
function clearDirty(keys: string[], store: Storage, snapshot: Map<string, string | null>) {
  const d = readDirty();
  let touched = false;
  for (const k of keys) {
    // Only clear if the value didn't change again while we were pushing.
    if (d.has(k) && store.getItem(k) === snapshot.get(k)) { d.delete(k); touched = true; }
  }
  if (touched) writeDirty(d);
}

export function isSyncedKey(key: string): boolean {
  return key.startsWith(PREFIX) && !LOCAL_ONLY.has(key);
}

type KeyListener = (key: string, value: string | null, origin: "local" | "remote") => void;

let installed = false;
let applyingRemote = false;
let uid: string | null = null;
const pending = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let channel: RealtimeChannel | null = null;
const listeners = new Set<KeyListener>();

let origSet: Storage["setItem"];
let origRemove: Storage["removeItem"];

function ls(): Storage | null {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

/** Subscribe to synced-key changes (used by the shared-records layer and UI refresh). */
export function onSyncedKeyChange(fn: KeyListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(key: string, value: string | null, origin: "local" | "remote") {
  for (const fn of listeners) {
    try { fn(key, value, origin); } catch (e) { console.warn("[sync] listener", e); }
  }
}

/** Patch Storage once so every existing store becomes cloud-aware with zero rewrites. */
export function installStorageHooks() {
  if (installed || typeof window === "undefined") return;
  const store = ls();
  if (!store) return;
  installed = true;
  const proto = Object.getPrototypeOf(store) as Storage;
  origSet = proto.setItem;
  origRemove = proto.removeItem;

  proto.setItem = function (this: Storage, key: string, value: string) {
    origSet.call(this, key, value);
    if (this === store && isSyncedKey(key) && !applyingRemote) {
      emit(key, value, "local");
      queue(key);
    }
  };
  proto.removeItem = function (this: Storage, key: string) {
    origRemove.call(this, key);
    if (this === store && isSyncedKey(key) && !applyingRemote) {
      emit(key, null, "local");
      queue(key);
    }
  };

  window.addEventListener("online", () => scheduleFlush(50));
  window.addEventListener("pagehide", () => { void flush(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
}

/** Write to localStorage without echoing the change back to the cloud. */
export function writeLocalSilently(key: string, value: string | null) {
  const store = ls();
  if (!store) return;
  applyingRemote = true;
  try {
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
  } finally {
    applyingRemote = false;
  }
}

function queue(key: string) {
  markDirty(key);
  if (!uid) return;
  pending.add(key);
  scheduleFlush(700);
}

function scheduleFlush(ms: number) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { void flush(); }, ms);
}

let flushing = false;
export async function flush(): Promise<void> {
  if (!uid || pending.size === 0 || flushing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const store = ls();
  if (!store) return;
  flushing = true;
  const keys = [...pending];
  pending.clear();
  const userId = uid;
  try {
    const upserts: { user_id: string; key: string; value: string; updated_at: string }[] = [];
    const deletes: string[] = [];
    const now = new Date().toISOString();
    const snapshot = new Map<string, string | null>();
    for (const k of keys) {
      const v = store.getItem(k);
      snapshot.set(k, v);
      if (v === null) deletes.push(k);
      else upserts.push({ user_id: userId, key: k, value: v, updated_at: now });
    }
    if (upserts.length) {
      const { error } = await supabase.from("user_kv").upsert(upserts, { onConflict: "user_id,key" });
      if (error) throw error;
    }
    if (deletes.length) {
      const { error } = await supabase.from("user_kv").delete().eq("user_id", userId).in("key", deletes);
      if (error) throw error;
    }
    clearDirty(keys, store, snapshot);
  } catch (e) {
    console.warn("[sync] push failed, will retry", e);
    for (const k of keys) pending.add(k);
    scheduleFlush(5000);
  } finally {
    flushing = false;
    if (pending.size) scheduleFlush(700);
  }
}

function ownsAppState(userId: string): boolean {
  try {
    const raw = ls()?.getItem("castit_app_v1");
    return !!raw && JSON.parse(raw)?.state?.userId === userId;
  } catch { return false; }
}

function localSyncedKeys(): string[] {
  const store = ls();
  if (!store) return [];
  const out: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && isSyncedKey(k)) out.push(k);
  }
  return out;
}

/**
 * Start syncing for a signed-in account. Returns true when the pull changed
 * local data (caller may want to refresh the current screen).
 */
export async function startSync(userId: string): Promise<boolean> {
  if (!isCloudConfigured()) return false;
  installStorageHooks();
  const store = ls();
  if (!store) return false;

  const previousOwner = store.getItem(CLOUD_UID_KEY);
  const firstTimeOnDevice = previousOwner !== userId;

  const { data, error } = await supabase.from("user_kv").select("key,value").eq("user_id", userId);
  if (error) {
    console.warn("[sync] pull failed", error);
    // Still accept local writes; they'll be pushed once reachable.
    uid = userId;
    return false;
  }

  let changed = false;
  const remote = new Map<string, string | null>((data ?? []).map((r) => [r.key as string, r.value as string | null]));

  if (firstTimeOnDevice) {
    // This device held guest/demo data or another account's data — never leak
    // it into this account. Replace it with the account's cloud copy.
    for (const k of localSyncedKeys()) {
      if (remote.has(k)) continue;
      // The app-state key may already belong to this account (sign-up in progress).
      if (k === "castit_app_v1" && ownsAppState(userId)) continue;
      writeLocalSilently(k, null);
      changed = true;
    }
    writeLocalSilently("castit_demo_seeded_v2", "1");
  }

  const dirty = firstTimeOnDevice ? new Set<string>() : readDirty();
  if (firstTimeOnDevice) writeDirty(new Set());
  for (const [k, v] of remote) {
    if (!isSyncedKey(k)) continue;
    if (dirty.has(k)) continue; // local edit not yet uploaded wins
    if (store.getItem(k) !== v) {
      writeLocalSilently(k, v);
      emit(k, v, "remote");
      changed = true;
    }
  }

  writeLocalSilently(CLOUD_UID_KEY, userId);
  uid = userId;

  // Same account, same device: anything only present locally (offline edits) goes up.
  if (!firstTimeOnDevice) {
    for (const k of localSyncedKeys()) if (!remote.has(k)) pending.add(k);
    for (const k of dirty) pending.add(k);
    if (pending.size) scheduleFlush(300);
  }

  subscribeRealtime(userId);
  return changed;
}

function subscribeRealtime(userId: string) {
  if (channel) { void supabase.removeChannel(channel); channel = null; }
  channel = supabase
    .channel(`user_kv:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "user_kv", filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = (payload.new && Object.keys(payload.new).length ? payload.new : payload.old) as { key?: string; value?: string | null };
        if (!row?.key || !isSyncedKey(row.key) || pending.has(row.key)) return;
        const value = payload.eventType === "DELETE" ? null : (row.value ?? null);
        if (ls()?.getItem(row.key) === value) return;
        writeLocalSilently(row.key, value);
        emit(row.key, value, "remote");
      },
    )
    .subscribe();
}

/** Stop syncing (sign-out). Optionally wipe this account's data off the device. */
export async function stopSync(opts: { wipeLocal?: boolean } = {}) {
  await flush();
  uid = null;
  pending.clear();
  if (channel) { void supabase.removeChannel(channel); channel = null; }
  if (opts.wipeLocal) {
    for (const k of localSyncedKeys()) writeLocalSilently(k, null);
    writeLocalSilently(CLOUD_UID_KEY, null);
    // Let guest mode show the demo again on this device.
    writeLocalSilently("castit_demo_seeded_v2", null);
    writeLocalSilently("castit_shared_meta_v1", null);
  }
}

export function currentSyncUser(): string | null {
  return uid;
}
