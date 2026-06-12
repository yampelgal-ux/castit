"use client";
import { create } from "zustand";
import { useEffect } from "react";

// ─── Lightweight theme store ───────────────────────────
// Sets data-theme="dark" | "light" on <html>. globals.css and
// tailwind.config.ts pick up the matching CSS vars automatically,
// so every existing class (bg-bg, text-muted, etc.) inverts.

export type Theme = "dark" | "light";

const KEY = "castit_theme_v1";

type ThemeState = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

function initialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(KEY);
  return stored === "light" || stored === "dark" ? stored : "dark";
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "dark",
  setTheme: (t) => {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, t);
    set({ theme: t });
  },
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, next);
    set({ theme: next });
  },
}));

// Hydrate from localStorage + reflect on <html data-theme>.
export function useHydrateTheme() {
  const setTheme = useThemeStore((s) => s.setTheme);
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    setTheme(initialTheme());
  }, [setTheme]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}
