"use client";
import { STAGE_META, type Stage } from "@/lib/projects-store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TONES = {
  gold:    "bg-gold/15 text-gold border-gold/30",
  plum:    "bg-plum/20 text-plum-light border-plum-light/30",
  sage:    "bg-sage/15 text-sage border-sage/30",
  success: "bg-success/15 text-success border-success/30",
  muted:   "bg-bg text-text-muted border-border",
  violet:  "bg-violet/20 text-violet border-violet/40",
  danger:  "bg-danger/15 text-danger border-danger/30",
};

export function StageBadge({ stage, size = "sm" }: { stage: Stage; size?: "sm" | "md" }) {
  const m = STAGE_META[stage];
  const { t } = useT();
  return (
    <span className={cn(
      "rounded-full border font-semibold uppercase tracking-wider whitespace-nowrap",
      TONES[m.tone],
      size === "sm" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2.5 py-1",
    )}>
      {t(`stage.label.${stage}`)}
    </span>
  );
}
