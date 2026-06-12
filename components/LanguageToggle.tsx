"use client";
import { Globe } from "lucide-react";
import { useLangStore, useHydrateLang } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// Mount-once hydrator — place in root layout so the chosen language
// is restored and reflected on <html lang> across the whole app.
export function LanguageHydrator() {
  useHydrateLang();
  return null;
}

// Pill toggle: עב / EN. Drop anywhere (welcome, profile, settings).
export function LanguageToggle({ className }: { className?: string }) {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  function pick(l: "he" | "en") {
    if (l === lang) return;
    setLang(l);
    haptic("light");
  }

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-full bg-bg-elevated/70 backdrop-blur border border-border p-0.5", className)}>
      <Globe className="w-3 h-3 text-text-subtle mx-1.5" />
      <button
        onClick={() => pick("he")}
        className={cn(
          "px-2.5 h-7 rounded-full text-[11px] font-semibold transition-colors",
          lang === "he" ? "bg-gold text-bg" : "text-text-muted"
        )}
      >
        עב
      </button>
      <button
        onClick={() => pick("en")}
        className={cn(
          "px-2.5 h-7 rounded-full text-[11px] font-semibold transition-colors",
          lang === "en" ? "bg-gold text-bg" : "text-text-muted"
        )}
      >
        EN
      </button>
    </div>
  );
}
