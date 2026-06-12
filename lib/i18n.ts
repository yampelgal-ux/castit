"use client";
import { create } from "zustand";
import { useEffect } from "react";
import { DICT } from "./i18n-strings";

// ─── Lightweight i18n ──────────────────────────────────
// Document stays LTR (the UI was built LTR-first with physical CSS props).
// Hebrew text renders correctly via the browser's bidi algorithm + dir="auto"
// on text containers. The toggle swaps copy, not layout — keeps every screen
// visually stable in both languages.

export type Lang = "he" | "en";

const KEY = "castit_lang_v1";

type LangState = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
};

function initialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(KEY);
  return stored === "he" || stored === "en" ? stored : "en";
}

export const useLangStore = create<LangState>((set, get) => ({
  lang: "en",
  setLang: (l) => {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, l);
    set({ lang: l });
  },
  toggle: () => {
    const next: Lang = get().lang === "he" ? "en" : "he";
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, next);
    set({ lang: next });
  },
}));

// Hydrate from localStorage on first client mount (avoids SSR mismatch)
export function useHydrateLang() {
  const setLang = useLangStore((s) => s.setLang);
  useEffect(() => {
    const l = initialLang();
    setLang(l);
    // Reflect on <html> for a11y + screen readers (lang only, not dir)
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
    }
  }, [setLang]);
}

// The translation hook. Returns { t, lang, dir }.
// t(key, params?) — params fills {placeholders}, e.g. t("ob.step", { n: 2 }).
export function useT() {
  const lang = useLangStore((s) => s.lang);
  function t(key: string, params?: Record<string, string | number>): string {
    const entry = DICT[key];
    let str = entry ? (entry[lang] ?? entry.en) : key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str;
  }
  return { t, lang, dir: (lang === "he" ? "rtl" : "ltr") as "rtl" | "ltr" };
}

// Non-hook accessor for places outside React render (rare)
export function translate(key: string, lang: Lang): string {
  return DICT[key]?.[lang] ?? key;
}
