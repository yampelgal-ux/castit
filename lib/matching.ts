import type { Talent, Audition } from "./mock-data";

// Hex → RGB
function hex(c: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(c);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// 1.0 = identical, 0 = max distance in sRGB
function colorSim(a: string, b: string): number {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const d = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  return Math.max(0, 1 - d / 441.67); // 441 = sqrt(3 * 255^2)
}

function colorMatchAny(c: string, pool?: string[]): number {
  if (!pool?.length) return 1;
  return Math.max(...pool.map((p) => colorSim(c, p)));
}

function inRange(val: number, range?: [number, number], tolerance = 0) {
  if (!range) return 1;
  const [lo, hi] = range;
  if (val >= lo && val <= hi) return 1;
  const diff = val < lo ? lo - val : val - hi;
  return Math.max(0, 1 - diff / Math.max(1, tolerance || (hi - lo) || 10));
}

function arrayOverlap(a?: string[], b?: string[]) {
  if (!b?.length) return 1;
  if (!a?.length) return 0;
  const setB = new Set(b.map((s) => s.toLowerCase()));
  const hit = a.filter((x) => setB.has(x.toLowerCase())).length;
  return hit / b.length;
}

function arrayContainsAny(a?: string[], b?: string[]) {
  if (!b?.length) return 1;
  if (!a?.length) return 0;
  const setA = new Set(a.map((s) => s.toLowerCase()));
  return b.some((x) => setA.has(x.toLowerCase())) ? 1 : 0;
}

export type MatchBreakdown = {
  score: number;            // 0..100
  passes: boolean;          // all hard filters satisfied
  blockers: string[];       // which filters failed
};

// All filters are AND. Soft fields contribute to score; hard fields (gender,
// union, location-when-mustTravel) can block.
export function matchTalent(
  t: Talent,
  f: Audition["targetTypecast"]
): MatchBreakdown {
  const tc = t.typecast;
  const blockers: string[] = [];
  let total = 0;
  let count = 0;

  // ── Hard filters ──
  if (f.gender?.length && !f.gender.includes(tc.gender)) {
    blockers.push("gender");
  }
  if (f.unionStatus?.length && tc.unionStatus && !f.unionStatus.includes(tc.unionStatus)) {
    blockers.push("union");
  }
  if (f.mustTravel && tc.willingToTravel === false) {
    blockers.push("travel");
  }

  // ── Soft scores ──
  const add = (s: number) => { total += s; count++; };

  if (f.ageRange) {
    // overlap between talent's age range and filter range
    const [lo, hi] = f.ageRange;
    const [tLo, tHi] = tc.ageRange;
    const overlap = Math.max(0, Math.min(hi, tHi) - Math.max(lo, tLo));
    const span = Math.max(1, hi - lo);
    add(Math.min(1, overlap / span));
  }
  if (f.heightRange) add(inRange(tc.heightCm, f.heightRange, 8));
  if (f.ethnicities?.length) add(arrayContainsAny([tc.ethnicity], f.ethnicities));
  if (f.bodyTypes?.length && tc.bodyType) add(f.bodyTypes.includes(tc.bodyType) ? 1 : 0);
  if (f.hairColors?.length) add(colorMatchAny(tc.hairColor, f.hairColors));
  if (f.eyeColors?.length) add(colorMatchAny(tc.eyeColor, f.eyeColors));
  if (f.skinTones?.length) add(colorMatchAny(tc.skinTone, f.skinTones));
  if (f.hairLengths?.length) add(f.hairLengths.includes(tc.hairLength) ? 1 : 0);
  if (f.languages?.length) add(arrayOverlap(tc.languages, f.languages));
  if (f.accents?.length) add(arrayOverlap(tc.accents, f.accents));
  if (f.voiceTypes?.length && tc.voiceType) add(f.voiceTypes.includes(tc.voiceType) ? 1 : 0);
  if (f.skills?.length) add(arrayOverlap(tc.skills, f.skills));
  if (f.experienceLevels?.length && tc.experienceLevel) {
    add(f.experienceLevels.includes(tc.experienceLevel) ? 1 : 0);
  }
  if (f.locations?.length && tc.location) {
    add(f.locations.some((l) => l.toLowerCase() === tc.location?.toLowerCase()) ? 1 : 0);
  }

  const avg = count === 0 ? 1 : total / count;
  const score = Math.round(avg * 100);
  return { score, passes: blockers.length === 0, blockers };
}

// Talent-side: does this audition fit me?
export function matchAudition(a: Audition, t: Talent): MatchBreakdown {
  return matchTalent(t, a.targetTypecast);
}
