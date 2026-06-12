"use client";
import { Globe, Sun, Moon } from "lucide-react";
import { useLangStore, useHydrateLang } from "@/lib/i18n";
import { useThemeStore, useHydrateTheme } from "@/lib/theme";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// Mount-once hydrator — place in root layout so the chosen language
// AND theme are restored and reflected on <html> across the whole app.
export function LanguageHydrator() {
  useHydrateLang();
  useHydrateTheme();
  return null;
}

// Pill toggle: sun / moon. Drop in settings sheet.
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  function pick(t: "dark" | "light") {
    if (t === theme) return;
    setTheme(t);
    haptic("light");
  }

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-full bg-bg-elevated/70 backdrop-blur border border-border p-0.5", className)}>
      <button
        onClick={() => pick("light")}
        aria-label="Light theme"
        className={cn(
          "inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-semibold transition-colors",
          theme === "light" ? "bg-gold text-bg" : "text-text-muted"
        )}
      >
        <Sun className="w-3 h-3" />
      </button>
      <button
        onClick={() => pick("dark")}
        aria-label="Dark theme"
        className={cn(
          "inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-semibold transition-colors",
          theme === "dark" ? "bg-gold text-bg" : "text-text-muted"
        )}
      >
        <Moon className="w-3 h-3" />
      </button>
    </div>
  );
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
