"use client";
import { useMemo } from "react";
import { avatarUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Avatar({
  seed,
  src,
  size = 40,
  className,
  ring,
}: {
  seed?: string;
  src?: string;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const finalSrc = useMemo(() => src ?? avatarUrl(seed ?? "guest"), [src, seed]);
  return (
    <img
      src={finalSrc}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn(
        "rounded-full object-cover bg-bg-elevated",
        ring && "ring-2 ring-gold ring-offset-2 ring-offset-bg",
        className
      )}
    />
  );
}
