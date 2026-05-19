"use client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColorSwatch } from "@/lib/typecast-palette";
import { IrisSwatch, SkinSwatch, HairSwatch } from "./TypecastVisuals";

type Kind = "eye" | "skin" | "hair";

export function TypecastPicker({
  kind,
  palette,
  value,
  onChange,
}: {
  kind: Kind;
  palette: ColorSwatch[];
  value: string | null;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {palette.map((s) => {
        const active = value === s.hex;
        return (
          <button
            key={s.hex}
            type="button"
            onClick={() => onChange(s.hex)}
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all",
              active
                ? "border-gold bg-gold/8 ring-1 ring-gold/40 scale-[1.03]"
                : "border-border bg-bg-elevated hover:border-border-strong"
            )}
            aria-label={s.name}
          >
            <div className="relative">
              {kind === "eye" && <IrisSwatch swatch={s} size={56} />}
              {kind === "skin" && <SkinSwatch swatch={s} size={56} />}
              {kind === "hair" && <HairSwatch swatch={s} size={56} />}
              {active && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gold grid place-items-center shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                  <Check className="w-3 h-3 text-bg" strokeWidth={3.5} />
                </span>
              )}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium leading-tight text-center px-0.5 truncate w-full",
                active ? "text-gold" : "text-text-muted"
              )}
            >
              {s.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
