"use client";
import Link from "next/link";
import { Settings } from "lucide-react";
import { useT } from "@/lib/i18n";

// Gear icon → the full settings screen (profile, videos, reminders,
// accessibility, language, account).
export function AccountButton({ className = "" }: { className?: string }) {
  const { lang } = useT();
  return (
    <Link
      href="/settings"
      aria-label={lang === "he" ? "הגדרות" : "Settings"}
      className={`w-11 h-11 -me-2 grid place-items-center text-text ${className}`}
    >
      <Settings className="w-5 h-5" />
    </Link>
  );
}
