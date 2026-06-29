"use client";
import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search, FolderOpen, Wand2, Zap, Users, Send, ClipboardCheck,
  ArrowLeft, Sparkles, FileText, PlayCircle, CheckCircle2, Clock,
} from "lucide-react";
import { useStore } from "@/lib/store";

// Public how-to guide for casting directors — shareable link, mobile-first.
// Walks through managing a project end-to-end. Static, no auth.

type Step = {
  n: number;
  icon: typeof Search;
  title: string;
  body: string;
  bullets?: string[];
  href?: string;
  cta?: string;
};

const STEPS: Step[] = [
  {
    n: 1,
    icon: FolderOpen,
    title: "צרי פרויקט",
    body: "כל הפקה מתחילה בתיקיית ליהוק. פתחי פרויקט חדש ובחרי את סוג הליהוק.",
    bullets: [
      "Full Casting — pipeline מלא של 8 שלבים (לידים, תפקידים מרכזיים).",
      "Quick Cast — 3 שלבים מהירים (ניצבים, דוגמנים, פרסומות).",
    ],
    href: "/pro/projects",
    cta: "פתחי פרויקט",
  },
  {
    n: 2,
    icon: Wand2,
    title: "הוסיפי תפקידים",
    body: "כל פרויקט מכיל את כל התפקידים שלו. אפשר להוסיף ידנית — או להדביק breakdown והמערכת תזהה ותבנה את כל התפקידים אוטומטית.",
    bullets: [
      "לכל תפקיד: brief, סיידס (טקסט או קובץ PDF), דדליין ותעריף.",
      "כפתור AI Bulk — מדביקים breakdown, מקבלים את כל התפקידים בלחיצה.",
    ],
  },
  {
    n: 3,
    icon: Search,
    title: "מצאי טאלנט והזמיני",
    body: "במקום טלפונים לסוכנויות — חיפוש מדויק לפי מערכת ה-Typecast (17 פרמטרים), או פשוט תיאור במילים.",
    bullets: [
      "\"אישה ים-תיכונית, 30-40, דוברת ערבית, רקע בקרב מגע\" → רשימה מדורגת לפי התאמה.",
      "בחירה מרובה → הזמנה קבוצתית בלחיצה אחת, כולל הסיידס.",
    ],
    href: "/pro/search",
    cta: "נסי את החיפוש",
  },
  {
    n: 4,
    icon: Zap,
    title: "סקרי טייפים מהר",
    body: "הטייפים נכנסים אוטומטית לתפקיד. במקום לפתוח 50 קבצים — סוקרים בהחלקה.",
    bullets: [
      "ימינה = Callback · שמאלה = Pass · מעלה = Hold.",
      "50 טייפים ב-5 דקות במקום שעה.",
    ],
    href: "/pro/triage",
    cta: "נסי את ה-Triage",
  },
  {
    n: 5,
    icon: Users,
    title: "נהלי את ה-Pipeline",
    body: "כל טאלנט מתקדם בשלבים, ואת רואה במבט אחד איפה כל אחד. שני צמתים דו-צדדיים — השחקן באמת מגיב.",
    bullets: [
      "Callback (פגישה פרונטלית או טייפ נוסף) → Hold עם טיימר.",
      "בדיקת זמינות → השחקן מאשר → הצעה → השחקן מקבל → Booked.",
    ],
  },
  {
    n: 6,
    icon: ClipboardCheck,
    title: "שתפי עם הבמאי",
    body: "בוחרים את הפיינליסטים → מקבלים דוח ליהוק מעוצב לשלוח לבמאי/מפיק. בלי WeTransfer, בלי קבצים כבדים.",
    bullets: [
      "הבמאי צופה ומצביע 👍 / 🤔 / 👎 על כל טייפ.",
      "ההצבעות מסתנכרנות אלייך בזמן אמת.",
    ],
    href: "/pro/approvals",
    cta: "Director Reviews",
  },
];

export default function GuidePage() {
  const setProfile = useStore((s) => s.setProfile);
  const signIn = useStore((s) => s.signIn);

  // This guide is the casting-director entry point — put the whole session
  // into Pro mode so the bottom nav and every linked screen stay on the
  // pro side (no talent tabs mixed in).
  useEffect(() => {
    setProfile({ role: "Casting Pro" });
    signIn();
  }, [setProfile, signIn]);

  return (
    <div className="min-h-dvh bg-bg" dir="rtl">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-20 -left-16 w-72 h-72 rounded-full bg-plum/20 blur-3xl pointer-events-none" />
        <div className="relative max-w-[560px] mx-auto px-6 pt-12 pb-8">
          <div className="font-display text-4xl font-black tracking-editorial">
            Cast<span className="text-gold">It</span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-gold font-semibold mt-2">
            מדריך למלהק/ת
          </div>
          <h1 className="font-display text-3xl tracking-editorial leading-tight mt-3">
            כל תהליך הליהוק — במקום אחד
          </h1>
          <p className="text-sm text-text-muted leading-relaxed mt-2">
            במקום וואטסאפ, מיילים, גוגל-דרייב ואקסל — מערכת אחת שבה את והטאלנטים נמצאים יחד.
            הנה איך מנהלים פרויקט מתחילתו ועד הסוף, ב-6 שלבים.
          </p>
          <Link
            href="/pro/dashboard"
            className="inline-flex items-center gap-2 mt-5 h-12 px-6 rounded-full bg-gold text-bg font-semibold text-sm active:scale-95 transition-transform"
          >
            <PlayCircle className="w-4 h-4" /> התחילי עכשיו
          </Link>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-[560px] mx-auto px-6 py-8 space-y-4">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl bg-bg-elevated border border-border overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gold/15 grid place-items-center shrink-0">
                  <s.icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">
                    שלב {s.n}
                  </div>
                  <h2 className="font-display text-xl tracking-editorial leading-none">{s.title}</h2>
                </div>
              </div>
              <p className="text-sm text-text leading-relaxed">{s.body}</p>
              {s.bullets && (
                <div className="mt-3 space-y-2">
                  {s.bullets.map((b, j) => (
                    <div key={j} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-gold/70 shrink-0 mt-0.5" />
                      <span className="text-[13px] text-text-muted leading-relaxed">{b}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {s.href && s.cta && (
              <Link
                href={s.href}
                className="block border-t border-border bg-bg/40 px-5 py-3 text-sm font-semibold text-gold inline-flex items-center gap-1.5 w-full"
              >
                {s.cta} <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            )}
          </motion.div>
        ))}

        {/* Quick Cast note */}
        <div className="rounded-3xl bg-gradient-to-br from-plum/15 to-bg-elevated border border-plum/30 p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-plum-light" />
            <div className="text-[10px] uppercase tracking-widest text-plum-light font-semibold">טיפ</div>
          </div>
          <h3 className="font-display text-lg">צריכה 50 ניצבים מהר?</h3>
          <p className="text-sm text-text-muted leading-relaxed mt-1">
            פתחי פרויקט במצב <b className="text-text">Quick Cast</b> — 3 שלבים בלבד והכרעה בלחיצה אחת (Select / Pass).
            פרויקט של עשרות ניצבים = דקות, לא שעות.
          </p>
        </div>

        {/* Final CTA */}
        <div className="text-center pt-6 pb-2">
          <div className="font-display text-2xl tracking-editorial">מוכנה להתחיל?</div>
          <p className="text-sm text-text-muted mt-1 mb-4">צרי את הפרויקט הראשון שלך — זה לוקח דקה.</p>
          <Link
            href="/pro/dashboard"
            className="inline-flex items-center gap-2 h-13 py-4 px-7 rounded-full bg-gold text-bg font-semibold active:scale-95 transition-transform"
          >
            <FolderOpen className="w-4 h-4" /> כניסה לסביבת העבודה
          </Link>
          <div className="mt-6 text-[11px] text-text-subtle">
            <span className="font-display text-gold">Cast</span>It · פחות לוגיסטיקה, יותר ליהוק
          </div>
        </div>
      </div>
    </div>
  );
}
