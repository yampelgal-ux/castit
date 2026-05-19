"use client";
import type { Audition } from "./mock-data";

const KEY = "castit_auditions_v1";

const SEED: Audition[] = [
  {
    id: "a-seed-1",
    postedBy: "pro-demo",
    studio: "Northwind Pictures",
    title: "Lead Female — 'After the Rain'",
    type: "Feature Film",
    location: "Tel Aviv + Sofia",
    paid: true,
    fee: "$4–6K/day + travel",
    deadline: "Jun 28",
    shootDates: "Aug 12 – Sep 25",
    description: "Female lead for a thriller-drama. Strong emotional range required.",
    selfTapeInstructions: "Slate + 90s monologue (English) + 60s scene (Hebrew). One vertical take.",
    targetTypecast: {
      gender: ["Female"],
      ageRange: [25, 33],
      heightRange: [165, 180],
      languages: ["Hebrew", "English"],
      experienceLevels: ["Established", "Veteran"],
      mustTravel: true,
    },
    applicants: 12,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "a-seed-2",
    postedBy: "pro-demo",
    studio: "Adidas IL",
    title: "Athletic Male — Sports Commercial",
    type: "Commercial",
    location: "Eilat",
    paid: true,
    fee: "$3.2K + usage",
    deadline: "Jun 12",
    description: "Looking for an energetic male athlete for a 2-day shoot.",
    targetTypecast: {
      gender: ["Male"],
      ageRange: [22, 30],
      heightRange: [175, 190],
      bodyTypes: ["Athletic", "Muscular"],
      skills: ["Surfing", "Skateboarding"],
    },
    applicants: 4,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export function loadAuditions(): Audition[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw);
  } catch {
    return SEED;
  }
}

export function saveAuditions(list: Audition[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addAudition(a: Audition) {
  const list = loadAuditions();
  list.unshift(a);
  saveAuditions(list);
}

export function getAudition(id: string): Audition | undefined {
  return loadAuditions().find((a) => a.id === id);
}

export function incrementApplicants(id: string) {
  const list = loadAuditions();
  const idx = list.findIndex((a) => a.id === id);
  if (idx >= 0) {
    list[idx].applicants += 1;
    saveAuditions(list);
  }
}
