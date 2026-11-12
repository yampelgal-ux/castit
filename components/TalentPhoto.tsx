"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** A talent's photo, or their first letter when there's no photo or it fails to load. */
export function TalentPhoto({ src, name, className }: { src?: string | null; name?: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className={cn("grid place-items-center bg-hi-soft text-text font-bold shrink-0", className)} aria-hidden>
        {(name ?? "").trim().charAt(0) || "?"}
      </div>
    );
  }
  return <img src={src} alt="" onError={() => setBroken(true)} className={cn("object-cover", className)} />;
}
