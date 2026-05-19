// Maps a typecast (hex colors + attributes) to a DiceBear avatar URL.
// Uses the "lorelei" style which supports skin/hair/eye customization.
// The avatar updates live as the user fills the typecast form.

import { SKIN_TONES, HAIR_COLORS } from "./typecast-palette";

// DiceBear lorelei supported skin colors (limited palette — we map to closest).
const DICEBEAR_SKIN = [
  { hex: "f9c9b6", ref: "#F5E2D4" },  // Porcelain
  { hex: "ffe4c0", ref: "#EFD0AE" },  // Warm Ivory
  { hex: "fdc89f", ref: "#E2BB92" },  // Golden Beige
  { hex: "c08458", ref: "#C89366" },  // Caramel
  { hex: "ac6651", ref: "#A87044" },  // Bronze
  { hex: "8d5524", ref: "#865234" },  // Chestnut
  { hex: "624532", ref: "#5E3820" },  // Mahogany
  { hex: "3a2410", ref: "#351E10" },  // Deep Ebony
];

// DiceBear lorelei supported hair colors.
const DICEBEAR_HAIR = [
  { hex: "0e0e0e", ref: "#0E0A08" },  // Jet Black
  { hex: "1a1715", ref: "#1C1410" },  // Soft Black
  { hex: "3a2410", ref: "#2E1E14" },  // Dark Brown
  { hex: "5a3520", ref: "#4A2E1A" },  // Warm Brown
  { hex: "6a4e35", ref: "#5E3820" },  // Chestnut
  { hex: "8b4513", ref: "#6E3820" },  // Auburn
  { hex: "b06940", ref: "#8C4820" },  // Copper
  { hex: "c87a5b", ref: "#B06848" },  // Strawberry Blonde
  { hex: "c8a067", ref: "#C09060" },  // Dirty Blonde
  { hex: "e5c876", ref: "#D4A850" },  // Golden Blonde
  { hex: "d4c8a0", ref: "#C8B888" },  // Ash Blonde
  { hex: "ece1c4", ref: "#E0D8C0" },  // Platinum
  { hex: "c0b8b0", ref: "#B0A8A0" },  // Silver-Grey
  { hex: "808890", ref: "#707880" },  // Steel Grey
  { hex: "a23018", ref: "#882818" },  // Warm Red
  { hex: "6e1818", ref: "#5C1818" },  // Burgundy
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function closestDicebearColor(targetHex: string, options: { hex: string; ref: string }[]): string {
  const [tr, tg, tb] = hexToRgb(targetHex);
  let best = options[0];
  let bestD = Infinity;
  for (const opt of options) {
    const [r, g, b] = hexToRgb(opt.ref);
    const d = (tr - r) ** 2 + (tg - g) ** 2 + (tb - b) ** 2;
    if (d < bestD) { bestD = d; best = opt; }
  }
  return best.hex;
}

// Choose hair variant index based on hair length + a deterministic seed component.
function hairVariant(length: string | undefined, seed: string): string {
  // DiceBear lorelei has variant01-48 for hair.
  // Short: variant 01-15. Medium: 16-32. Long: 33-48.
  const buckets: Record<string, [number, number]> = {
    Short: [1, 15],
    Medium: [16, 32],
    Long: [33, 48],
  };
  const [lo, hi] = buckets[length ?? "Medium"] ?? buckets.Medium;
  const seedSum = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  const variant = lo + (seedSum % (hi - lo + 1));
  return `variant${variant.toString().padStart(2, "0")}`;
}

export type TypecastForAvatar = {
  skinTone?: string;
  hairColor?: string;
  hairLength?: string;
  eyeColor?: string;
  gender?: string;
};

export function avatarFromTypecast(typecast: TypecastForAvatar, seed: string): string {
  const base = `https://api.dicebear.com/9.x/lorelei/svg`;
  const params = new URLSearchParams();
  params.set("seed", seed || "talent");
  params.set("backgroundColor", "1F1F24,2D2823");
  params.set("radius", "50");

  if (typecast.skinTone) {
    params.set("skinColor", closestDicebearColor(typecast.skinTone, DICEBEAR_SKIN));
  }
  if (typecast.hairColor) {
    params.set("hairColor", closestDicebearColor(typecast.hairColor, DICEBEAR_HAIR));
  }
  if (typecast.hairLength) {
    params.set("hair", hairVariant(typecast.hairLength, seed));
  }

  return `${base}?${params.toString()}`;
}

// Re-export for places that just want a seed-only avatar
export function simpleAvatar(seed: string): string {
  return `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(seed)}&backgroundColor=1F1F24,2D2823&radius=50`;
}
