"use client";

// Real registered talents (Supabase `profiles.talent_card`) — merged into the
// Pro search / talent pages next to the curated demo roster, and the signed-in
// talent's own card is published from their profile + typecast.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isCloudConfigured } from "./config";
import { TALENTS, type Talent } from "@/lib/mock-data";

let cache: Talent[] = [];
let inflight: Promise<Talent[]> | null = null;
let fetchedAt = 0;

export function getCachedRealTalents(): Talent[] {
  return cache;
}

export async function fetchRealTalents(force = false): Promise<Talent[]> {
  if (!isCloudConfigured()) return [];
  if (!force && Date.now() - fetchedAt < 60_000) return cache;
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
