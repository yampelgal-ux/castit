"use client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColorSwatch } from "@/lib/typecast-palette";

// Renders a 3D sphere using radial-gradient with palette highlight/shadow when available,
// falling back to inset box-shadow for palettes without those values.
function swatchStyle(s: ColorSwatch): React.CSSProperties {
  if (s.highlight && s.shadow) {
    return {
      background: `radial-gradient(circle at 33% 28%, ${s.highlight} 0%, ${s.hex} 48%, ${s.shadow} 100%)`,
    };
  }
  return { background: s.hex };
}

export function ColorSwatchPicker({
  label,
  palette,
  value,
  onChange,
  multi = true,
}: {
  label: string;
  palette: ColorSwatch[];
  value: string[];
  onChange: (v: string[]) => void;
  multi?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] text-text-muted">{label}</div>
        {value.length > 0 && (
          <span className="text-[10px] text-gold font-semibold tnum">{value.length} selected</span>
        )}
      </div>
      <div className="grid grid-cols-5 gap-x-2 gap-y-3">
        {palette.map((s) => {
          const active = value.includes(s.hex);
          return (
            <button
              key={s.hex}
              onClick={() => {
                if (active) onChange(value.filter((v) => v !== s.hex));
                else onChange(multi ? [...value, s.hex] : [s.hex]);
              }}
              className="flex flex-col items-center gap-1.5 group"
              aria-label={s.name}
              title={s.name}
            >
              <span
                className={cn(
                  "relative w-11 h-11 rounded-full transition-all duration-150",
                  "ring-1 ring-inset ring-white/10",
                  active
                    ? "ring-2 ring-gold ring-offset-1 ring-offset-bg scale-110 shadow-[0_0_12px_rgba(212,165,74,0.4)]"
                    : "hover:scale-105 shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                )}
                style={swatchStyle(s)}
              >
                {active && (
                  <span className="absolute inset-0 grid place-items-center">
                    <Check
                      className="w-4 h-4 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                      strokeWidth={3}
                    />
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[9px] leading-tight text-center w-full truncate transition-colors",
                  active ? "text-gold font-semibold" : "text-text-subtle group-hover:text-text-muted"
                )}
              >
                {s.short ?? s.name.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Tiny inline 3D swatch — for displaying selections in chips/cards
export function InlineSwatch({ swatch, size = 14 }: { swatch: ColorSwatch; size?: number }) {
  return (
    <span
      className="inline-block rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
      style={{ ...swatchStyle(swatch), width: size, height: size, flexShrink: 0 }}
    />
  );
}

// Hex-only variant for backwards compat where full swatch isn't available
export function InlineSwatchHex({ hex, size = 14 }: { hex: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full ring-1 ring-inset ring-white/10 shadow-[inset_-1px_-2px_3px_rgba(0,0,0,0.3),inset_1px_1px_2px_rgba(255,255,255,0.15)]"
      style={{ background: hex, width: size, height: size }}
    />
  );
}
