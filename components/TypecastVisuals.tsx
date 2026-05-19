"use client";
import type { ColorSwatch } from "@/lib/typecast-palette";

// Photorealistic iris rendering — limbal ring, radial iris texture, pupil, catchlight.
// Uses palette highlight/shadow for proper depth.
export function IrisSwatch({ swatch, size = 56 }: { swatch: ColorSwatch; size?: number }) {
  const id = swatch.hex.replace("#", "");
  const highlight = swatch.highlight || lighten(swatch.hex, 0.2);
  const shadow = swatch.shadow || darken(swatch.hex, 0.3);
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
      <defs>
        {/* Sclera gradient — slightly off-white with shadow at edges */}
        <radialGradient id={`sclera-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="85%" stopColor="#e8e0d8" />
          <stop offset="100%" stopColor="#a89888" />
        </radialGradient>
        {/* Iris gradient — center pupil-ward bright, edge limbal-ring dark */}
        <radialGradient id={`iris-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={highlight} />
          <stop offset="50%" stopColor={swatch.hex} />
          <stop offset="92%" stopColor={shadow} />
          <stop offset="100%" stopColor="#1a0e08" />
        </radialGradient>
        {/* Radial striations for iris texture */}
        <radialGradient id={`striate-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="55%" stopColor="rgba(0,0,0,0.12)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
        </radialGradient>
      </defs>

      {/* Almond-shaped sclera */}
      <ellipse cx="30" cy="30" rx="28" ry="18" fill={`url(#sclera-${id})`} />

      {/* Eyelid shadow top */}
      <path d="M 4 26 Q 30 8 56 26" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
      {/* Eyelid shadow bottom */}
      <path d="M 6 35 Q 30 48 54 35" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />

      {/* Iris — main color */}
      <circle cx="30" cy="30" r="14" fill={`url(#iris-${id})`} />

      {/* Radial striations (creates depth/realism) */}
      <circle cx="30" cy="30" r="14" fill={`url(#striate-${id})`} />

      {/* Subtle iris fibers — short lines radiating outward */}
      {[...Array(16)].map((_, i) => {
        const angle = (i * 22.5) * Math.PI / 180;
        const x1 = 30 + Math.cos(angle) * 6;
        const y1 = 30 + Math.sin(angle) * 6;
        const x2 = 30 + Math.cos(angle) * 13;
        const y2 = 30 + Math.sin(angle) * 13;
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={shadow}
            strokeWidth="0.4"
            opacity="0.5"
          />
        );
      })}

      {/* Outer limbal ring */}
      <circle cx="30" cy="30" r="14" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="0.8" />

      {/* Pupil */}
      <circle cx="30" cy="30" r="5.5" fill="#050202" />

      {/* Main catchlight (highlight reflection) */}
      <ellipse cx="26" cy="25.5" rx="2.5" ry="3.2" fill="rgba(255,255,255,0.92)" />

      {/* Secondary tiny catchlight */}
      <circle cx="33.5" cy="33" r="0.8" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}

// Skin patch — looks like a close-up of cheek/forearm skin with natural texture
export function SkinSwatch({ swatch, size = 56 }: { swatch: ColorSwatch; size?: number }) {
  const id = swatch.hex.replace("#", "");
  const highlight = swatch.highlight || lighten(swatch.hex, 0.18);
  const shadow = swatch.shadow || darken(swatch.hex, 0.25);
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
      <defs>
        {/* Skin radial gradient — soft light from top-left */}
        <radialGradient id={`skin-${id}`} cx="33%" cy="30%" r="75%">
          <stop offset="0%" stopColor={highlight} />
          <stop offset="55%" stopColor={swatch.hex} />
          <stop offset="100%" stopColor={shadow} />
        </radialGradient>
        {/* Subtle skin texture noise */}
        <filter id={`skin-noise-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="2.5" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      {/* Skin patch — rounded square for that "close-up of skin" feel */}
      <rect x="2" y="2" width="56" height="56" rx="28" fill={`url(#skin-${id})`} />

      {/* Texture overlay */}
      <rect x="2" y="2" width="56" height="56" rx="28" filter={`url(#skin-noise-${id})`} opacity="0.6" />

      {/* Subtle inner shadow ring */}
      <rect x="2" y="2" width="56" height="56" rx="28" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />

      {/* Soft top-left highlight glow */}
      <ellipse cx="22" cy="20" rx="14" ry="10" fill="rgba(255,255,255,0.18)" />
    </svg>
  );
}

// Hair strand — a curled lock with natural color variance and shine
export function HairSwatch({ swatch, size = 56 }: { swatch: ColorSwatch; size?: number }) {
  const id = swatch.hex.replace("#", "");
  const highlight = swatch.highlight || lighten(swatch.hex, 0.25);
  const shadow = swatch.shadow || darken(swatch.hex, 0.3);
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
      <defs>
        {/* Hair strand gradient — light catch on the curve */}
        <linearGradient id={`hair-base-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={shadow} />
          <stop offset="35%" stopColor={swatch.hex} />
          <stop offset="55%" stopColor={highlight} />
          <stop offset="75%" stopColor={swatch.hex} />
          <stop offset="100%" stopColor={shadow} />
        </linearGradient>
        {/* Individual strand highlight */}
        <linearGradient id={`hair-shine-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Background — base hair color */}
      <rect x="2" y="2" width="56" height="56" rx="28" fill={swatch.hex} />

      {/* Wavy hair strands */}
      {[0, 1, 2, 3, 4].map((i) => {
        const offset = i * 10 - 5;
        return (
          <path
            key={i}
            d={`M ${5 + offset} 5 Q ${15 + offset} 20 ${10 + offset} 30 Q ${5 + offset} 40 ${15 + offset} 55`}
            stroke={`url(#hair-base-${id})`}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            opacity={0.85 + (i % 2) * 0.1}
          />
        );
      })}

      {/* Shine streak across */}
      <path
        d="M 8 8 Q 30 25 52 8 Q 30 35 8 50 Q 30 45 52 50"
        stroke={`url(#hair-shine-${id})`}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Inner shadow ring (vignette) */}
      <rect x="2" y="2" width="56" height="56" rx="28" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />

      {/* Hidden mask — only show within the circle */}
      <rect x="0" y="0" width="60" height="60" fill="rgba(0,0,0,0)" />
    </svg>
  );
}

// Color manipulation helpers (used only when palette doesn't provide highlight/shadow)
function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    Math.min(255, Math.round(r + (255 - r) * amount)),
    Math.min(255, Math.round(g + (255 - g) * amount)),
    Math.min(255, Math.round(b + (255 - b) * amount))
  );
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    Math.max(0, Math.round(r * (1 - amount))),
    Math.max(0, Math.round(g * (1 - amount))),
    Math.max(0, Math.round(b * (1 - amount)))
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}
