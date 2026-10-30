"use client";

// Casting search: the filter shape, the matching run, and saved searches.
// A saved search remembers which talents it already showed, so new talents
// who match it later show up as "N new" on the search page and dashboard.

import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Talent, BodyType, VoiceType, UnionStatus, ExperienceLevel } from "./mock-data";
import { matchTalent, type MatchBreakdown } from "./matching";
import { useAllTalents } from "./cloud/talents";

export type Filters = {
  gender: string[];
  ageRange?: [number, number];
  heightRange?: [number, number];
  ethnicities: string[];
  bodyTypes: BodyType[];
  hairColors: string[];
  hairLengths: ("Short" | "Medium" | "Long")[];
  eyeColors: string[];
  skinTones: string[];
  languages: string[];
  accents: string[];
  voiceTypes: VoiceType[];
  skills: string[];
  unionStatus: UnionStatus[];
  experienceLevels: ExperienceLevel[];
  locations: string[];
  mustTravel: boolean;
  weightRange?: [number, number];
  hairTypes: string[];
  facialHair: string[];
  features: string[];
  genres: string[];
  clothingSizes: string[];
  shoeRange?: [number, number];
  needsLicense: boolean;
  needsAgent: boolean;
  workPermits: string[];
  hasVideo: boolean;
  verifiedOnly: boolean;
};

export const EMPTY_FILTERS: Filters = {
  gender: [], ethnicities: [], bodyTypes: [], hairColors: [], hairLengths: [],
  eyeColors: [], skinTones: [], languages: [], accents: [], voiceTypes: [],
  skills: [], unionStatus: [], experienceLevels: [], locations: [], mustTravel: false,
  hairTypes: [], facialHair: [], features: [], genres: [], clothingSizes: [],
  needsLicense: false, needsAgent: false, workPermits: [], hasVideo: false, verifiedOnly: false,
};

/** Talents passing the filters and text query, each with its match result (unsorted). */
export function runSearch(talents: Talent[], f: Filters, q: string): { talent: Talent; match: MatchBreakdown }[] {
  const anySoft =
    !!f.ageRange || !!f.heightRange ||
    f.ethnicities.length || f.bodyTypes.length ||
    f.hairColors.length || f.hairLengths.length ||
    f.eyeColors.length || f.skinTones.length ||
    f.languages.length || f.accents.length || f.voiceTypes.length ||
    f.skills.length || f.experienceLevels.length || f.locations.length ||
    !!f.weightRange || !!f.shoeRange || f.hairTypes.length || f.facialHair.length ||
    f.features.length || f.genres.length || f.clothingSizes.length;
  const threshold = anySoft ? 30 : 0;
  const needle = q.trim().toLowerCase();
  return talents
    .filter((t) => !needle || [t.name, t.username, t.bio, ...(t.typecast.skills || [])].some((x) => (x || "").toLowerCase().includes(needle)))
    .filter((t) => !f.hasVideo || (t.reels?.length ?? 0) > 0)
    .filter((t) => !f.verifiedOnly || t.verified)
    .map((t) => ({
      talent: t,
      match: matchTalent(t, {
        ...f,
        mustTravel: f.mustTravel || undefined,
        needsLicense: f.needsLicense || undefined,
        needsAgent: f.needsAgent || undefined,
      }),
    }))
    .filter((r) => r.match.passes && r.match.score >= threshold);
}

export type SavedProSearch = {
  id: string;
  name: string;
  filters: Filters;
  q: string;
  /** Talent ids already shown for this search. */
  seenIds: string[];
  createdAt: string;
};

type State = {
  searches: SavedProSearch[];
  save: (name: string, filters: Filters, q: string, matchIds: string[]) => void;
  remove: (id: string) => void;
  markSeen: (id: string, matchIds: string[]) => void;
};

export const useProSavedSearches = create<State>()(
  persist(
    (set) => ({
      searches: [],
      save: (name, filters, q, matchIds) =>
        set((s) => ({
          searches: [
            { id: `ss-${Date.now()}`, name, filters, q, seenIds: matchIds, createdAt: new Date().toISOString() },
            ...s.searches,
          ].slice(0, 12),
        })),
      remove: (id) => set((s) => ({ searches: s.searches.filter((x) => x.id !== id) })),
      markSeen: (id, matchIds) =>
        set((s) => ({
          searches: s.searches.map((x) =>
            x.id === id ? { ...x, seenIds: Array.from(new Set([...x.seenIds, ...matchIds])) } : x),
        })),
    }),
    { name: "castit_pro_saved_searches_v1" }
  )
);

/** For each saved search: the ids that match now but were not seen yet. */
export function useSavedSearchAlerts(): { search: SavedProSearch; newIds: string[] }[] {
  const talents = useAllTalents();
  const searches = useProSavedSearches((s) => s.searches);
  return useMemo(
    () => searches.map((search) => {
      const seen = new Set(search.seenIds);
      const newIds = runSearch(talents, { ...EMPTY_FILTERS, ...search.filters }, search.q)
        .map((r) => r.talent.id)
        .filter((id) => !seen.has(id));
      return { search, newIds };
    }),
    [talents, searches]
  );
}

/** A short automatic name for a search, from its first few filters. */
export function autoSearchName(f: Filters, q: string, label: (v: string) => string, he: boolean): string {
  const parts: string[] = [];
  if (q.trim()) parts.push(q.trim());
  parts.push(...f.gender.map(label));
  if (f.ageRange) parts.push(`${f.ageRange[0]}–${f.ageRange[1]}`);
  parts.push(...f.skills.map(label), ...f.languages.map(label), ...f.locations.map(label), ...f.ethnicities.map(label));
  const name = parts.slice(0, 3).join(" · ");
  return name || (he ? "חיפוש שמור" : "Saved search");
}
