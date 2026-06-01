"use client";
import { create } from "zustand";
import { useEffect, useState } from "react";

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

// ─── Dictionary ────────────────────────────────────────
// Keys are dot-namespaced. Add new strings here — both languages required.
type Entry = { en: string; he: string };

const DICT: Record<string, Entry> = {
  // Navigation (talent)
  "nav.feed":          { en: "Feed",       he: "פיד" },
  "nav.discover":      { en: "Discover",   he: "גילוי" },
  "nav.auditions":     { en: "Auditions",  he: "אודישנים" },
  "nav.messages":      { en: "Messages",   he: "הודעות" },
  "nav.profile":       { en: "Profile",    he: "פרופיל" },
  // Navigation (pro)
  "nav.studio":        { en: "Studio",     he: "סטודיו" },
  "nav.projects":      { en: "Projects",   he: "פרויקטים" },
  "nav.search":        { en: "Search",     he: "חיפוש" },
  "nav.reels":         { en: "Reels",      he: "רילים" },

  // Welcome
  "welcome.eyebrow":   { en: "Built for the next generation of talent", he: "נבנה לדור הבא של הכישרונות" },
  "welcome.tagline1":  { en: "Where talent meets", he: "המקום שבו כישרון פוגש" },
  "welcome.tagline2":  { en: "opportunity", he: "הזדמנות" },
  "welcome.sub":       { en: "The casting platform actors, models and creators have been waiting for. Get discovered by the people who matter.", he: "פלטפורמת הליהוק ששחקנים, דוגמנים ויוצרים חיכו לה. תתגלו על ידי האנשים שחשובים." },
  "welcome.joined":    { en: "talents joined this season", he: "כישרונות הצטרפו העונה" },
  "welcome.getStarted":{ en: "Get Started", he: "בוא נתחיל" },
  "welcome.haveAccount": { en: "I already have an account", he: "כבר יש לי חשבון" },
  "welcome.proLine1":  { en: "I'm a casting professional", he: "אני איש ליהוק מקצועי" },

  // Common actions
  "common.next":       { en: "Next",     he: "הבא" },
  "common.back":       { en: "Back",     he: "חזור" },
  "common.skip":       { en: "Skip",     he: "דלג" },
  "common.save":       { en: "Save",     he: "שמור" },
  "common.cancel":     { en: "Cancel",   he: "ביטול" },
  "common.done":       { en: "Done",     he: "סיום" },
  "common.send":       { en: "Send",     he: "שלח" },
  "common.upload":     { en: "Upload",   he: "העלאה" },
  "common.continue":   { en: "Continue", he: "המשך" },
  "common.markAllRead":{ en: "Mark all read", he: "סמן הכל כנקרא" },

  // Notifications
  "notif.title":       { en: "Notifications", he: "התראות" },
  "notif.empty":       { en: "No notifications", he: "אין התראות" },
  "notif.emptyDesc":   { en: "When a pro invites you, sends a callback, or something important happens — you'll see it here.", he: "כשמלהק יזמין אותך, ישלח callback, או יקרה משהו חשוב — תקבל כאן עדכון." },

  // Language toggle
  "lang.label":        { en: "Language", he: "שפה" },
  "lang.he":           { en: "עברית", he: "עברית" },
  "lang.en":           { en: "English", he: "English" },

  // Onboarding
  "ob.step":           { en: "Step {n} of 3", he: "שלב {n} מתוך 3" },
  "ob.role.title":     { en: "Who are you on", he: "מי אתה ב־" },
  "ob.role.sub":       { en: "Pick the one that fits today — you can switch later.", he: "בחר את מה שמתאים היום — אפשר להחליף בהמשך." },
  "ob.role.talent":    { en: "Talent", he: "כישרון" },
  "ob.role.talentDesc":{ en: "Actor, model, creator. Post reels, get cast.", he: "שחקן, דוגמן, יוצר. פרסם רילים, היבחר לתפקידים." },
  "ob.role.pro":       { en: "Casting Pro", he: "איש ליהוק" },
  "ob.role.proDesc":   { en: "Director, agent, producer. Discover talent.", he: "במאי, סוכן, מפיק. גלה כישרונות." },
  "ob.goals.title":    { en: "What are you here for?", he: "מה הביא אותך לכאן?" },
  "ob.goals.sub":      { en: "Pick any — we'll tailor your feed.", he: "בחר כמה שתרצה — נתאים לך את הפיד." },
  "ob.goal.discovered":{ en: "Get discovered", he: "להתגלות" },
  "ob.goal.discoveredDesc": { en: "Show your reels to casting pros", he: "הצג את הרילים שלך למלהקים" },
  "ob.goal.scenes":    { en: "Practice scenes", he: "לתרגל סצנות" },
  "ob.goal.scenesDesc":{ en: "Sharpen your craft daily", he: "חדד את המשחק שלך יום-יום" },
  "ob.goal.castings":  { en: "Apply to roles", he: "להגיש לתפקידים" },
  "ob.goal.castingsDesc": { en: "Match with paid opportunities", he: "התאמה להזדמנויות בתשלום" },
  "ob.goal.network":   { en: "Build a network", he: "לבנות רשת קשרים" },
  "ob.goal.networkDesc": { en: "Connect with other creatives", he: "התחבר ליוצרים אחרים" },
  "ob.photo.title":    { en: "Add a face to the name", he: "תוסיף פנים לשם" },
  "ob.photo.sub":      { en: "A profile photo boosts your discovery rate 5×.", he: "תמונת פרופיל מגבירה את סיכויי הגילוי שלך פי 5." },
  "ob.photo.tap":      { en: "Tap to upload", he: "הקש להעלאה" },
  "ob.photo.change":   { en: "Change photo", he: "החלף תמונה" },
  "ob.photo.add":      { en: "Add a profile photo", he: "הוסף תמונת פרופיל" },
  "ob.photo.later":    { en: "You can skip this and add a photo later from your profile settings.", he: "אפשר לדלג ולהוסיף תמונה מאוחר יותר מהגדרות הפרופיל." },
  "ob.enter":          { en: "Enter CastIt", he: "כניסה ל-CastIt" },
  "ob.skipNow":        { en: "Skip for now", he: "דלג לבינתיים" },
};

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
