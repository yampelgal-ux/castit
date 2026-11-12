"use client";
import { useT } from "@/lib/i18n";

export function SkipLink() {
  const { lang } = useT();
  return <a href="#main-content" className="skip-link">{lang === "en" ? "Skip to content" : "דילוג לתוכן"}</a>;
}
