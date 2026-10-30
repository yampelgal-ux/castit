"use client";
import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { useMyReels } from "@/lib/reels-store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Step = { id: string; done: boolean; he: string; en: string; href: string };

/** What a talent's profile still lacks. Complete profiles show up better in casting searches. */
export function useProfileSteps(): Step[] {
  const p = useStore((s) => s.profile);
  const reels = useMyReels((s) => s.reels.length);
  const t = p.typecast ?? {};
  return [
    { id: "photo", done: !!p.photoUrl, he: "תמונת פרופיל", en: "Profile photo", href: "/settings" },
    { id: "bio", done: (p.bio?.trim().length ?? 0) >= 20, he: "כמה משפטים עליך", en: "A short bio", href: "/settings" },
    { id: "headshots", done: (p.headshots?.length ?? 0) >= 3, he: "3 תמונות לגלריה", en: "3 gallery photos", href: "/settings" },
    { id: "reel", done: reels > 0, he: "סרטון ראשון", en: "A first video", href: "/studio/upload" },
    { id: "basics", done: !!t.gender && !!t.ageRangeMin && !!t.ageRangeMax && !!t.heightCm, he: "מגדר, טווח גילאים וגובה", en: "Gender, age range and height", href: "/typecast" },
    { id: "location", done: !!t.location, he: "איפה את/ה גר/ה", en: "Where you live", href: "/typecast" },
    { id: "skills", done: (t.languages?.length ?? 0) > 0 && (t.skills?.length ?? 0) > 0, he: "שפות ומיומנויות", en: "Languages and skills", href: "/typecast" },
  ];
}

export function ProfileCompleteness({ compact = false }: { compact?: boolean }) {
  const { lang } = useT();
  const he = lang === "he";
  const role = useStore((s) => s.profile.role);
  const steps = useProfileSteps();
  if (role !== "Talent") return null;
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  if (pct === 100) return null;
  const next = steps.find((s) => !s.done)!;

  if (compact) {
    return (
      <Link href={next.href} className="flex items-center gap-3 p-3 rounded-2xl bg-bg-elevated border border-border hover:border-gold/40">
        <Ring pct={pct} />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold">{he ? `הפרופיל שלך ${pct}% מוכן` : `Your profile is ${pct}% ready`}</span>
          <span className="block text-[0.6875rem] text-text-muted truncate">{he ? `הצעד הבא: ${next.he}` : `Next: ${next.en}`}</span>
        </span>
        <ChevronLeft className="w-4 h-4 text-text-muted ltr:rotate-180" aria-hidden />
      </Link>
    );
  }

  return (
    <section className="p-4 rounded-2xl bg-bg-elevated border border-border" aria-labelledby="pc-h">
      <div className="flex items-center gap-3">
        <Ring pct={pct} />
        <div>
          <h2 id="pc-h" className="text-sm font-semibold">{he ? `הפרופיל שלך ${pct}% מוכן` : `Your profile is ${pct}% ready`}</h2>
          <p className="text-[0.6875rem] text-text-muted">{he ? "פרופיל מלא מופיע גבוה יותר בחיפוש של מלהקים." : "Complete profiles rank higher in casting searches."}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1">
        {steps.map((s) => (
          <li key={s.id}>
            {s.done ? (
              <span className="flex items-center gap-2 text-xs text-text-muted py-1.5"><Check className="w-3.5 h-3.5 text-sage" aria-hidden /> <s>{he ? s.he : s.en}</s></span>
            ) : (
              <Link href={s.href} className="flex items-center gap-2 text-xs font-semibold py-1.5">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-border-strong" aria-hidden /> {he ? s.he : s.en}
                <ChevronLeft className="w-3.5 h-3.5 text-text-muted ms-auto ltr:rotate-180" aria-hidden />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 16, c = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0" role="img" aria-label={`${pct}%`}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgb(var(--border))" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgb(var(--hi))" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 20 20)" />
      <text x="20" y="24" textAnchor="middle" fontSize="11" fontWeight="700" fill="rgb(var(--text))" className={cn("tnum")}>{pct}</text>
    </svg>
  );
}
