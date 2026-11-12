"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Video, ChevronLeft, ChevronRight, Check, Users, Megaphone, ClipboardCheck, Camera } from "lucide-react";

const KEY = "castit_onboarding_done_v1";

type Step = {
  icon: typeof Sparkles;
  tone: "gold" | "plum" | "sage";
  title: [string, string];
  body: [string, string];
  cta?: { label: [string, string]; href: string };
};

// [Hebrew, English]. Only features that work in the live app.
const TALENT_STEPS: Step[] = [
  {
    icon: Sparkles, tone: "gold",
    title: ["ברוכים הבאים ל-CastIt", "Welcome to CastIt"],
    body: ["המקום שבו שחקנים ומלהקים נפגשים. ככה זה עובד, בחצי דקה.", "Where actors and casting directors meet. Here's how it works, in 30 seconds."],
  },
  {
    icon: Camera, tone: "gold",
    title: ["פרופיל שמלהקים מוצאים", "A profile casting directors find"],
    body: ["תמונה, ריל ופרטים כמו גיל, גובה ושפות. ככל שהפרופיל מלא יותר, כך מופיעים יותר בחיפוש.", "A photo, a reel and details like age, height and languages. The fuller your profile, the more you show up in search."],
    cta: { label: ["העלאת ריל", "Upload a reel"], href: "/studio/upload" },
  },
  {
    icon: Megaphone, tone: "plum",
    title: ["אודישנים פתוחים", "Open auditions"],
    body: ["מלהקים מפרסמים תפקידים, ואפשר להגיש בלחיצה.", "Casting directors post roles, and you can apply in one tap."],
    cta: { label: ["ללוח האודישנים", "See open auditions"], href: "/auditions" },
  },
  {
    icon: Video, tone: "sage",
    title: ["הזמנות וסלף-טייפ", "Invites and self-tapes"],
    body: ["הזמנות מגיעות לתיבה. מקליטים טייפ ישר מהטלפון ושולחים, ורואים מתי יש קולבק.", "Invites land in your inbox. Record a tape right on your phone, send it, and see when you get a callback."],
    cta: { label: ["לתיבה", "Open inbox"], href: "/inbox" },
  },
];

const PRO_STEPS: Step[] = [
  {
    icon: Sparkles, tone: "gold",
    title: ["ברוכים הבאים ל-CastIt", "Welcome to CastIt"],
    body: ["כל הליהוק במקום אחד: פרויקטים, תפקידים, טייפים והחלטות. ככה זה עובד.", "All your casting in one place: projects, roles, tapes and decisions. Here's how it works."],
  },
  {
    icon: Users, tone: "gold",
    title: ["פרויקט ותפקידים", "Projects and roles"],
    body: ["פותחים פרויקט, מוסיפים תפקידים, ומחפשים שחקנים לפי גיל, מראה, שפות וכישורים.", "Create a project, add roles, and search actors by age, look, languages and skills."],
    cta: { label: ["לפרויקטים", "Go to projects"], href: "/pro/projects" },
  },
  {
    icon: Megaphone, tone: "plum",
    title: ["הזמנה בוואטסאפ או אודישן פתוח", "Invite on WhatsApp, or post an open audition"],
    body: ["שולחים קישור לתפקיד גם לשחקנים שעוד לא באפליקציה, או מפרסמים בלוח ושחקנים מתאימים מקבלים התראה.", "Send a role link to actors who aren't on the app yet, or post it on the board and matching actors get notified."],
  },
  {
    icon: ClipboardCheck, tone: "sage",
    title: ["טייפים והחלטות", "Tapes and decisions"],
    body: ["הטייפים מגיעים לתפקיד. מסמנים קולבק, שולחים לבמאי להצבעה, ומודיעים לשחקן.", "Tapes arrive in the role. Mark callbacks, send picks to the director to vote, and let the actor know."],
    cta: { label: ["אישורי במאי", "Director reviews"], href: "/pro/approvals" },
  },
];

/** The tour opens once, on the first home screen after signing up. */
const HOME = new Set(["/feed", "/inbox", "/profile/me", "/pro/dashboard", "/pro/projects"]);

export function OnboardingTour() {
  const pathname = usePathname();
  const { lang, dir } = useT();
  const he = lang === "he";
  const i = he ? 0 : 1;
  const authed = useStore((s) => s.isAuthed);
  const role = useStore((s) => s.profile.role);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const steps = role === "Casting Pro" ? PRO_STEPS : TALENT_STEPS;

  useEffect(() => {
    if (!authed || !HOME.has(pathname ?? "")) return;
    try { if (localStorage.getItem(KEY)) return; } catch { return; }
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [pathname, authed]);

  function dismiss() {
    if (typeof window !== "undefined") {
      try { localStorage.setItem(KEY, "1"); } catch {}
    }
    setOpen(false);
  }

  function next() {
    if (step < steps.length - 1) setStep(step + 1);
    else dismiss();
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  if (!open) return null;
  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  const toneCls =
    current.tone === "gold" ? "bg-gold/15 text-gold border-gold/30"
    : current.tone === "plum" ? "bg-plum/15 text-plum-light border-plum/30"
    : "bg-sage/15 text-sage border-sage/30";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] grid place-items-center p-4 max-w-[440px] mx-auto" dir={dir} role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={dismiss} />

        <motion.div
          key={step}
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full bg-bg-elevated border border-border rounded-3xl p-6 shadow-2xl"
        >
          {/* Skip */}
          <button
            onClick={dismiss}
            className="absolute top-3 end-3 px-2 py-1 text-xs text-text-muted"
          >
            {he ? "דילוג" : "Skip"}
          </button>

          {/* Progress dots */}
          <div className="flex gap-1.5 justify-center mb-5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-gold" : i < step ? "w-1.5 bg-gold/40" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className={`w-14 h-14 mx-auto rounded-2xl border grid place-items-center mb-4 ${toneCls}`}>
            <Icon className="w-7 h-7" />
          </div>

          {/* Title + body */}
          <h2 id="tour-title" className="font-display text-2xl tracking-editorial text-center">{current.title[i]}</h2>
          <p className="text-sm text-text-muted text-center mt-2 leading-relaxed">
            {current.body[i]}
          </p>

          {/* Optional CTA */}
          {current.cta && (
            <Link
              href={current.cta.href}
              onClick={dismiss}
              className="block mt-4 h-10 rounded-full bg-bg border border-gold/30 text-xs font-semibold text-gold inline-flex items-center justify-center gap-1.5 w-full"
            >
              {current.cta.label[i]} <ChevronLeft className="w-3 h-3 ltr:rotate-180" aria-hidden />
            </Link>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-2 mt-5">
            {step > 0 && (
              <button
                onClick={prev}
                className="h-11 px-4 rounded-full bg-bg border border-border text-xs font-semibold inline-flex items-center justify-center gap-1.5 text-text-muted"
              >
                <ChevronRight className="w-3.5 h-3.5 ltr:rotate-180" aria-hidden /> {he ? "חזרה" : "Back"}
              </button>
            )}
            <button
              onClick={next}
              className="flex-1 h-11 rounded-full bg-gold text-on-accent font-semibold text-sm inline-flex items-center justify-center gap-1.5"
            >
              {isLast ? (
                <><Check className="w-4 h-4" aria-hidden /> {he ? "יאללה, מתחילים" : "Let's go"}</>
              ) : (
                <>{he ? "הבא" : "Next"} ({step + 1}/{steps.length}) <ChevronLeft className="w-4 h-4 ltr:rotate-180" aria-hidden /></>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
