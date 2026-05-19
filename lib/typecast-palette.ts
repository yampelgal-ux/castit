// Simplified, natural color palette for typecasting.
// Real-world, intuitive categories that match how people describe themselves.

export type ColorSwatch = {
  hex: string;
  name: string;
  short?: string;
  highlight?: string;
  shadow?: string;
};

// 6 natural skin tones — light to dark
export const SKIN_TONES: ColorSwatch[] = [
  { hex: "#F0D5B8", name: "Fair",    highlight: "#F8E6D0", shadow: "#D0A878" },
  { hex: "#E0BB92", name: "Light",   highlight: "#EDD4B0", shadow: "#BC9466" },
  { hex: "#C89366", name: "Medium",  highlight: "#DDB488", shadow: "#A06A3C" },
  { hex: "#A87044", name: "Tan",     highlight: "#C49062", shadow: "#7E4E22" },
  { hex: "#865234", name: "Brown",   highlight: "#A8704E", shadow: "#5C3018" },
  { hex: "#4D2A1A", name: "Dark",    highlight: "#6E4030", shadow: "#2A150A" },
];

// 6 common eye colors — what people actually say
export const EYE_COLORS: ColorSwatch[] = [
  { hex: "#2A1810", name: "Black",  highlight: "#3E281E", shadow: "#100804" },
  { hex: "#5A3520", name: "Brown",  highlight: "#7A5038", shadow: "#381808" },
  { hex: "#7A6040", name: "Hazel",  highlight: "#9A8060", shadow: "#584020" },
  { hex: "#5C7548", name: "Green",  highlight: "#7C9568", shadow: "#3E5530" },
  { hex: "#4060A0", name: "Blue",   highlight: "#6080C0", shadow: "#204080" },
  { hex: "#888888", name: "Grey",   highlight: "#A8A8A8", shadow: "#606060" },
];

// 7 common hair colors
export const HAIR_COLORS: ColorSwatch[] = [
  { hex: "#0E0A08", name: "Black",      highlight: "#241A14", shadow: "#040202" },
  { hex: "#3A2418", name: "Dark Brown", highlight: "#54382A", shadow: "#1E0E08" },
  { hex: "#5E3820", name: "Brown",      highlight: "#7E5038", shadow: "#3A1C08" },
  { hex: "#A04820", name: "Red",        highlight: "#C46838", shadow: "#702808" },
  { hex: "#C8A45C", name: "Blonde",     highlight: "#E4C480", shadow: "#9C7C3C" },
  { hex: "#A8A8A8", name: "Grey",       highlight: "#C8C8C8", shadow: "#808080" },
  { hex: "#E5DED0", name: "White",      highlight: "#F2EDE0", shadow: "#BCB4A0" },
];

export function nameOf(palette: ColorSwatch[], hex: string): string {
  const norm = hex.toUpperCase();
  const exact = palette.find((s) => s.hex.toUpperCase() === norm);
  if (exact) return exact.name;
  const [r, g, b] = hexToRgb(norm);
  let best = palette[0], bestD = Infinity;
  for (const s of palette) {
    const [r2, g2, b2] = hexToRgb(s.hex);
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (d < bestD) { bestD = d; best = s; }
  }
  return best.name;
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
}

export const BODY_TYPES = [
  { id: "Slim",      label: "Slim",      icon: "▍",  desc: "Lean build" },
  { id: "Athletic",  label: "Athletic",  icon: "▎▌", desc: "Toned & fit" },
  { id: "Average",   label: "Average",   icon: "▌",  desc: "Standard build" },
  { id: "Curvy",     label: "Curvy",     icon: "❯",  desc: "Hourglass" },
  { id: "Muscular",  label: "Muscular",  icon: "█",  desc: "Heavily built" },
  { id: "Plus-size", label: "Plus-size", icon: "▉",  desc: "Plus-size" },
] as const;
