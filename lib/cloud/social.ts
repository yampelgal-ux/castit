"use client";

// Likes, comments and view counts on reels (Supabase tables from
// migration 003). Counters are fetched in batches and kept in a small store
// so every screen showing the same reel agrees.

import { useEffect } from "react";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { isCloudConfigured, isRealUserId } from "./config";

export type ReelStats = { likes: number; comments: number; views: number; liked: boolean };
export type ReelComment = {
  id: string; reel_id: string; owner_id: string; user_id: string;
  author_name: string; author_photo: string; body: string; created_at: string;
};

const EMPTY: ReelStats = { likes: 0, comments: 0, views: 0, liked: false };

const useSocial = create<{ stats: Record<string, ReelStats> }>(() => ({ stats: {} }));

function patch(id: string, p: Partial<ReelStats>) {
  useSocial.setState((s) => ({ stats: { ...s.stats, [id]: { ...(s.stats[id] ?? EMPTY), ...p } } }));
}

function myId(): string | null {
  const id = useStore.getState().userId;
  return isRealUserId(id) ? id : null;
}

const live = () => isCloudConfigured();

// ── Batched counters ─────────────────────────────────────
const pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  timer = null;
  const ids = [...pending];
  pending.clear();
  if (!ids.length || !live()) return;
  const { data, error } = await supabase.rpc("reel_stats", { p_ids: ids });
  if (error) { console.warn("[social] stats", error.message); return; }
  const next: Record<string, ReelStats> = {};
  for (const r of (data ?? []) as any[]) {
    next[r.reel_id] = { likes: r.likes ?? 0, comments: r.comments ?? 0, views: r.views ?? 0, liked: !!r.liked };
  }
  useSocial.setState((s) => ({ stats: { ...s.stats, ...next } }));
}

export function refreshReelStats(ids: string[]) {
  ids.forEach((i) => pending.add(i));
  if (!timer) timer = setTimeout(flush, 60);
}

/** Live counters for one reel (zeros until loaded, or without a backend). */
export function useReelStats(reelId: string): ReelStats {
  useEffect(() => { refreshReelStats([reelId]); }, [reelId]);
  return useSocial((s) => s.stats[reelId]) ?? EMPTY;
}

// ── Likes ────────────────────────────────────────────────
/** Toggle my like. Returns false when the user has to sign in first. */
export async function toggleReelLike(reelId: string, ownerId: string): Promise<boolean> {
  const cur = useSocial.getState().stats[reelId] ?? EMPTY;
  const liked = !cur.liked;
  patch(reelId, { liked, likes: Math.max(0, cur.likes + (liked ? 1 : -1)) });
  const me = myId();
  if (!live() || !isRealUserId(ownerId)) return true; // demo reels: local only
  if (!me) { patch(reelId, cur); return false; }
  const { error } = liked
    ? await supabase.from("reel_likes").insert({ reel_id: reelId, owner_id: ownerId, user_id: me })
    : await supabase.from("reel_likes").delete().eq("reel_id", reelId).eq("user_id", me);
  if (error && !/duplicate/i.test(error.message)) {
    console.warn("[social] like", error.message);
    patch(reelId, cur);
  }
  return true;
}

// ── Views ────────────────────────────────────────────────
const viewed = new Set<string>();
/** Count one view per signed-in viewer (the owner's own views don't count). */
export async function recordReelView(reelId: string, ownerId: string) {
  const me = myId();
  if (!live() || !me || me === ownerId || !isRealUserId(ownerId) || viewed.has(reelId)) return;
  viewed.add(reelId);
  const { error } = await supabase.from("reel_views").insert({ reel_id: reelId, owner_id: ownerId, viewer_id: me });
  if (!error) {
    const cur = useSocial.getState().stats[reelId];
    if (cur) patch(reelId, { views: cur.views + 1 });
  }
}

// ── Comments ─────────────────────────────────────────────
export async function fetchReelComments(reelId: string): Promise<ReelComment[]> {
  if (!live()) return [];
  const { data, error } = await supabase
    .from("reel_comments").select("*").eq("reel_id", reelId).order("created_at", { ascending: true }).limit(300);
  if (error) { console.warn("[social] comments", error.message); return []; }
  return (data ?? []) as ReelComment[];
}

export async function addReelComment(reelId: string, ownerId: string, body: string): Promise<ReelComment | "signed-out" | null> {
  const me = myId();
  const text = body.trim().slice(0, 1000);
  if (!text || !live() || !isRealUserId(ownerId)) return null;
  if (!me) return "signed-out";
  const p = useStore.getState().profile;
  const { data, error } = await supabase.from("reel_comments").insert({
    reel_id: reelId, owner_id: ownerId, user_id: me,
    author_name: p.name || p.username || "", author_photo: p.photoUrl || "", body: text,
  }).select().single();
  if (error) { console.warn("[social] comment", error.message); return null; }
  const cur = useSocial.getState().stats[reelId] ?? EMPTY;
  patch(reelId, { comments: cur.comments + 1 });
  return data as ReelComment;
}

export async function deleteReelComment(c: ReelComment): Promise<boolean> {
  const { error } = await supabase.from("reel_comments").delete().eq("id", c.id);
  if (error) return false;
  const cur = useSocial.getState().stats[c.reel_id] ?? EMPTY;
  patch(c.reel_id, { comments: Math.max(0, cur.comments - 1) });
  return true;
}

/** The owner removed a reel: drop its likes / comments / views too. */
export async function deleteReelSocial(reelId: string) {
  if (!live() || !myId()) return;
  await supabase.rpc("delete_reel_social", { p_reel_id: reelId });
}

export { myId as currentSocialUser };
