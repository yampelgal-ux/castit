"use client";

// Blocking, reporting and account deletion (Supabase migration 004).
// Blocks hide people both ways: whoever I blocked and whoever blocked me
// disappear from the feed, search, messages and comments.

import { useEffect } from "react";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { isCloudConfigured, isRealUserId } from "./config";
import { signOutEverywhere } from "./auth";

type HiddenState = {
  /** Everyone hidden from me (blocked by me or blocking me). */
  hidden: Set<string>;
  /** Only the ones I blocked (these I can unblock). */
  mine: Set<string>;
  loadedFor: string | null;
};

export const useHidden = create<HiddenState>(() => ({ hidden: new Set(), mine: new Set(), loadedFor: null }));

function myId(): string | null {
  const id = useStore.getState().userId;
  return isRealUserId(id) ? id : null;
}

let inflight: Promise<void> | null = null;

export function refreshHidden(): Promise<void> {
  const me = myId();
  if (!isCloudConfigured() || !me) return Promise.resolve();
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase.rpc("my_hidden_users");
    inflight = null;
    if (error) { console.warn("[safety] hidden", error.message); return; }
    const rows = (data ?? []) as { user_id: string; blocked_by_me: boolean }[];
    useHidden.setState({
      hidden: new Set(rows.map((r) => r.user_id)),
      mine: new Set(rows.filter((r) => r.blocked_by_me).map((r) => r.user_id)),
      loadedFor: me,
    });
  })();
  return inflight;
}

/** Ids of people this user must not see. Loads once per account. */
export function useHiddenUsers(): Set<string> {
  const userId = useStore((s) => s.userId);
  const { hidden, loadedFor } = useHidden();
  useEffect(() => {
    if (isRealUserId(userId) && loadedFor !== userId) void refreshHidden();
  }, [userId, loadedFor]);
  return isRealUserId(userId) && loadedFor === userId ? hidden : EMPTY;
}
const EMPTY = new Set<string>();

export function useIsBlockedByMe(id: string | undefined): boolean {
  const mine = useHidden((s) => s.mine);
  return !!id && mine.has(id);
}

export async function blockUser(id: string): Promise<boolean> {
  const me = myId();
  if (!me || !isRealUserId(id) || id === me) return false;
  const { error } = await supabase.from("blocks").insert({ blocker_id: me, blocked_id: id });
  if (error && !/duplicate/i.test(error.message)) { console.warn("[safety] block", error.message); return false; }
  const s = useHidden.getState();
  useHidden.setState({ hidden: new Set([...s.hidden, id]), mine: new Set([...s.mine, id]) });
  return true;
}

export async function unblockUser(id: string): Promise<boolean> {
  const me = myId();
  if (!me) return false;
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", me).eq("blocked_id", id);
  if (error) { console.warn("[safety] unblock", error.message); return false; }
  await refreshHidden();
  return true;
}

export type ReportKind = "user" | "reel" | "comment" | "message";

export async function sendReport(r: { kind: ReportKind; targetUser?: string; targetId?: string; reason: string; details?: string }): Promise<boolean> {
  const me = myId();
  if (!me || !isCloudConfigured()) return false;
  const { error } = await supabase.from("reports").insert({
    reporter_id: me,
    target_kind: r.kind,
    target_user: isRealUserId(r.targetUser) ? r.targetUser : null,
    target_id: r.targetId ?? null,
    reason: r.reason,
    details: r.details?.trim() || null,
  });
  if (error) { console.warn("[safety] report", error.message); return false; }
  return true;
}

/**
 * Delete the signed-in account: its files in Storage, then every row tied to
 * it, then sign out and wipe this device. Returns an error code on failure.
 */
export async function deleteMyAccount(): Promise<"ok" | "signed-out" | "failed"> {
  const me = myId();
  if (!me || !isCloudConfigured()) return "signed-out";
  const { data: paths } = await supabase.rpc("my_media_paths");
  const list = ((paths ?? []) as unknown[]).map((p) => (typeof p === "string" ? p : (p as any)?.my_media_paths)).filter(Boolean) as string[];
  for (let i = 0; i < list.length; i += 100) {
    try { await supabase.storage.from("media").remove(list.slice(i, i + 100)); } catch {}
  }
  const { error } = await supabase.rpc("delete_my_account");
  if (error) { console.warn("[safety] delete account", error.message); return "failed"; }
  await signOutEverywhere();
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("castit_")) localStorage.removeItem(k);
    indexedDB.deleteDatabase("castit_tapes");
  } catch {}
  return "ok";
}
