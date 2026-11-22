"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sun, ChevronLeft } from "lucide-react";
import { useT } from "@/lib/i18n";
import { buildProDigest, type DigestLine } from "@/lib/pro-digest";
import { addNotification } from "@/lib/notifications-store";
import { cn } from "@/lib/utils";

const SENT_KEY = "castit_pro_digest_day_v1";

/** "Your day" on the casting dashboard; also drops one notification a day with the summary. */
export function ProDigestCard() {
  const { lang } = useT();
  const he = lang === "he";
  const [lines, setLines] = useState<DigestLine[]>([]);
  useEffect(() => {
    const refresh = () => setLines(buildProDigest());
    refresh();
    window.addEventListener("castit:remote-update", refresh);
    return () => window.removeEventListener("castit:remote-update", refresh);
  }, []);
  useEffect(() => {
    if (!lines.length) return;
    const day = new Date().toDateString();
    try {
      if (localStorage.getItem(SENT_KEY) === day) return;
      localStorage.setItem(SENT_KEY, day);
    } catch { return; }
    addNotification({
      audience: "pro",
      kind: "tape_in",
      title: he ? "☀️ הסיכום היומי שלך" : "☀️ Your daily summary",
      body: lines.slice(0, 3).map((l) => (he ? l.he : l.en)).join(" · "),
      href: "/pro/dashboard",
    });
  }, [lines, he]);
  if (!lines.length) return null;
  const hour = new Date().getHours();
  return (
    <section aria-label={he ? "היום שלך" : "Your day"} className="rounded-2xl border border-border bg-bg-elevated p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sun className="w-4 h-4 text-gold" aria-hidden />
        <h2 className="text-[0.6875rem] uppercase tracking-widest text-gold font-semibold">
          {hour < 12 ? (he ? "הבוקר שלך" : "Your morning") : (he ? "היום שלך" : "Your day")}
        </h2>
      </div>
      <ul className="divide-y divide-border">
        {lines.map((l) => (
          <li key={l.key}>
            <Link href={l.href} className="flex items-center gap-2 py-2.5 text-sm">
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", l.urgent ? "bg-danger" : "bg-gold")} aria-hidden />
              <span className="flex-1">{he ? l.he : l.en}</span>
              <ChevronLeft className="w-4 h-4 text-text-muted ltr:rotate-180" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
