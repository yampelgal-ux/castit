"use client";
import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  tone?: "gold" | "plum" | "sage" | "terra";
  className?: string;
};

const TONE = {
  gold: { bg: "bg-gold/10", text: "text-gold", btn: "bg-gold text-bg" },
  plum: { bg: "bg-plum/15", text: "text-plum-light", btn: "bg-plum text-text" },
  sage: { bg: "bg-sage/15", text: "text-sage", btn: "bg-sage text-bg" },
  terra: { bg: "bg-terra/15", text: "text-terra", btn: "bg-terra text-text" },
};

export function EmptyState({
  icon: Icon, title, description, ctaLabel, ctaHref, ctaOnClick,
  tone = "gold", className,
}: Props) {
  const t = TONE[tone];
  const cta = ctaLabel && (
    <button
      onClick={ctaOnClick}
      className={cn("mt-5 inline-flex items-center gap-2 px-5 h-11 rounded-full font-semibold text-sm", t.btn)}
    >
      {ctaLabel}
    </button>
  );

  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-8 py-16", className)}>
      <div className={cn("w-16 h-16 rounded-full grid place-items-center mb-4", t.bg)}>
        <Icon className={cn("w-7 h-7", t.text)} />
      </div>
      <h3 className="font-display text-xl tracking-editorial mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-text-muted max-w-[260px] leading-relaxed">{description}</p>
      )}
      {ctaHref ? (
        <Link href={ctaHref} className={cn("mt-5 inline-flex items-center gap-2 px-5 h-11 rounded-full font-semibold text-sm", t.btn)}>
          {ctaLabel}
        </Link>
      ) : cta}
    </div>
  );
}
