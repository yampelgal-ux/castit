"use client";

// Real registered talents (Supabase `profiles.talent_card`) — merged into the
// Pro search / talent pages next to the curated demo roster, and the signed-in
// talent's own card is published from their profile + typecast.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isCloudConfigured } from "./config";
import { mediaPublicUrl } from "./media";
import { useMyReels } from "@/lib/reels-store";
import { useStore } from "@/lib/store";
import { TALENTS, REELS, type Talent, type ReelPost } from "@/lib/mock-data";

let cache: Talent[] = [];
let inflight: Promise<Talent[]> | null = null;
let fetchedAt = 0;

export function getCachedRealTalents(): Talent[] {
  return cache;
}

export async function fetchRealTalents(force = false): Promise<Talent[]> {
  if (!isCloudConfigured()) return [];
  if (!force && Date.now() - fetchedAt < 10_000) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,talent_card")
      .eq("role", "talent")
      .not("talent_card", "is", null)
      .order("updated_at", { ascending: false })
      .limit(500);
    inflight = null;
    if (error) { console.warn("[talents]", error.message); return cache; }
    cache = (data ?? [])
      .map((r) => ({ ...(r.talent_card as Talent), id: r.id as string }))
      .filter((t) => t && t.name);
    fetchedAt = Date.now();
    return cache;
  })();
  return inflight;
}

/** Demo roster + real registered talents (real ones first). */
export function useAllTalents(): Talent[] {
  const [real, setReal] = useState<Talent[]>(cache);
  useEffect(() => {
    let alive = true;
    fetchRealTalents().then((t) => { if (alive) setReal(t); });
    return () => { alive = false; };
  }, []);
  return real.length ? [...real, ...TALENTS.filter((t) => !real.some((r) => r.id === t.id))] : TALENTS;
}

export function useTalentById(id: string | undefined): Talent | undefined {
  const all = useAllTalents();
  return id ? all.find((t) => t.id === id) : undefined;
}

/** Reels from real talents' published cards (newest first), plus the demo reels in demo mode. */
export function reelsFromTalents(talents: Talent[]): ReelPost[] {
  const real: ReelPost[] = talents
    .flatMap((t) => (t.reels ?? []).map((r) => ({
      id: r.id, talentId: t.id, videoUrl: r.url, poster: "", caption: r.caption,
      likes: 0, comments: 0, shares: 0, createdAt: r.createdAt,
    })))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ createdAt: _c, ...r }) => r);
  return [...real, ...REELS.filter((r) => !real.some((x) => x.id === r.id))];
}

export function useAllReels(): { reels: ReelPost[]; talents: Talent[] } {
  const talents = useAllTalents();
  // My own published videos show up right away, before the shared list refreshes.
  const mine = useMyReels((s) => s.reels);
  const userId = useStore((s) => s.userId);
  const profile = useStore((s) => s.profile);
  const myCloud = mine.filter((r) => r.cloud);
  if (!userId || myCloud.length === 0) return { reels: reelsFromTalents(talents), talents };
  const existing = talents.find((t) => t.id === userId);
  const me: Talent = {
    ...(existing ?? {
      id: userId, username: profile.username || "me", name: profile.name || "", verified: false,
      photo: profile.photoUrl || "", cover: "", bio: profile.bio || "", followers: 0, likes: 0, submissions: 0,
      typecast: { heightCm: 170, weightKg: 65, ageRange: [20, 30], gender: "Female", ethnicity: "", skinTone: "", eyeColor: "", hairColor: "", hairLength: "Medium", languages: [], skills: [], genres: [] },
    }),
    reels: myCloud.map((r) => ({ id: r.id, url: mediaPublicUrl(`tapes/${r.blobKey}`) || "", caption: r.caption, createdAt: r.createdAt })),
  };
  const merged = [me, ...talents.filter((t) => t.id !== userId)];
  return { reels: reelsFromTalents(merged), talents: merged };
}
