"use client";
import { Header } from "@/components/Header";
import { useT } from "@/lib/i18n";

export type LegalSection = { he: { title: string; body: string[] }; en: { title: string; body: string[] } };

export const LEGAL_UPDATED = "2026-10-29";

/** Shared layout for the terms and privacy pages (Hebrew first, English mirror). */
export function LegalPage({ title, intro, sections }: {
  title: { he: string; en: string }; intro: { he: string; en: string }; sections: LegalSection[];
}) {
  const { lang, dir } = useT();
  const he = lang === "he";
  const date = new Date(LEGAL_UPDATED).toLocaleDateString(he ? "he-IL" : "en-US", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="min-h-dvh bg-bg pb-16" dir={dir}>
      <Header back title={he ? title.he : title.en} />
      <article className="px-5 pt-4 max-w-prose mx-auto">
        <p className="text-xs text-text-muted">{he ? `עודכן לאחרונה: ${date}` : `Last updated: ${date}`}</p>
        <p className="mt-3 text-[0.9375rem] leading-relaxed">{he ? intro.he : intro.en}</p>
        {sections.map((s, i) => {
          const c = he ? s.he : s.en;
          return (
            <section key={i} className="mt-6">
              <h2 className="font-display text-lg">{i + 1}. {c.title}</h2>
              {c.body.map((p, j) => (
                <p key={j} className="mt-2 text-sm leading-relaxed text-text-muted">{p}</p>
              ))}
            </section>
          );
        })}
      </article>
    </div>
  );
}
