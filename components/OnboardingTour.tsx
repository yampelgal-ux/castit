"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Search, Video, Inbox, Wand2, ChevronLeft, ChevronRight,
  X, Check, Users, Megaphone, Zap, ClipboardCheck, Disc, Camera,
} from "lucide-react";

const KEY = "castit_onboarding_done_v1";

type Step = {
  icon: typeof Sparkles;
  tone: "gold" | "plum" | "sage";
  title: string;
  body: string;
  cta?: { label: string; href: string };
};

const TALENT_STEPS: Step[] = [
  {
    icon: Sparkles,
    tone: "gold",
    title: "ברוך הבא ל-CastIt",
    body: "פלטפורמת הליהוק הראשונה שעובדת בשבילך — לא בשבילם. נראה לך מה נמצא היכן ב-60 שניות.",
  },
  {
    icon: Camera,
    tone: "gold",
    title: "Self-tape בתוך האפליקציה",
    body: "כשתקבל הזמנה, תוכל להקליט טייפ עם framing guide, sides על המסך, וכמה לקיחות. Aria אפילו תיתן לך הוראות בימוי לפני שתתחיל.",
    cta: { label: "Audition Inbox", href: "/inbox" },
  },
  {
    icon: Wand2,
    tone: "plum",
    title: "AI Coach להכנה",
    body: "העלה סצנה (תמונה או טקסט) → בחר את התפקיד שלך, את הקול והטונציה של השותף → תרגל איתה כמו עם מאמן אמיתי. נשמר בספרייה.",
    cta: { label: "פתח Coach", href: "/studio/coach" },
  },
  {
    icon: Search,
    tone: "sage",
    title: "אתה גלוי בחיפוש",
    body: "מלהקים מחפשים לפי 17 פרמטרים — גובה, שפות, מבטאים, כישורים. ככל שהפרופיל שלך מלא יותר, כך תופיע יותר.",
    cta: { label: "Typecast Profile", href: "/typecast" },
  },
];

const PRO_STEPS: Step[] = [
  {
    icon: Sparkles,
    tone: "gold",
    title: "ברוך הבא ל-CastIt Pro",
    body: "Pipeline ליהוק מלא + AI שעובד בשבילך. נסקור 4 כלים שתשתמש בהם כל יום.",
  },
  {
    icon: Inbox,
    tone: "gold",
    title: "Action Inbox מאוחד",
    body: "כל הפעולות הדורשות תשומת לב — חוצה פרויקטים — במקום אחד. Holds שעומדים לפוג, טייפים לסקירה, offers שמחכים.",
    cta: { label: "Action Inbox", href: "/pro/inbox" },
  },
  {
    icon: Zap,
    tone: "plum",
    title: "Tape Triage Mode",
    body: "החלק ימינה=Callback, שמאלה=Pass, למעלה=Hold. סקור 50 טייפים ב-5 דקות במקום שעה.",
    cta: { label: "Triage", href: "/pro/triage" },
  },
  {
    icon: Wand2,
    tone: "plum",
    title: "AI לכל שלב",
    body: "Bulk Roles מקבלים breakdown ובונים את כל התפקידים. Tape Analysis סורק כל טייפ ומכין דוח. Comm Automation כותב הודעות במקומך.",
    cta: { label: "פרויקטים", href: "/pro/projects" },
  },
  {
    icon: ClipboardCheck,
    tone: "sage",
    title: "Director Reviews",
    body: "בוחר 5 טייפים → שולח קישור לבמאי → הוא מצביע 👍/🤔/👎 → אתה רואה בזמן אמת. בלי WeTransfer, בלי שיחות.",
    cta: { label: "Director Reviews", href: "/pro/approvals" },
  },
];

export function OnboardingTour() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Detect mode (pro vs talent) from URL
  const isPro = pathname?.startsWith("/pro") ?? false;
  const steps = isPro ? PRO_STEPS : TALENT_STEPS;

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Don't show on share/approve public pages
    if (pathname?.startsWith("/share") || pathname?.startsWith("/approve") || pathname?.startsWith("/tour")) return;
    // Don't show on signup/welcome (have their own intro)
    if (pathname === "/welcome" || pathname === "/signup" || pathname === "/pro/signup" || pathname === "/pro/login") return;
    const done = localStorage.getItem(KEY);
    if (done) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [pathname]);

  function dismiss() {
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, "1");
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
      <div className="fixed inset-0 z-[100] grid place-items-center p-4 max-w-[440px] mx-auto">
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
            className="absolute top-4 left-4 text-[11px] text-text-muted"
          >
            דלג
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
          <h2 className="font-display text-2xl tracking-editorial text-center">{current.title}</h2>
          <p className="text-sm text-text-muted text-center mt-2 leading-relaxed">
            {current.body}
          </p>

          {/* Optional CTA */}
          {current.cta && (
            <Link
              href={current.cta.href}
              onClick={dismiss}
              className="block mt-4 h-10 rounded-full bg-bg border border-gold/30 text-xs font-semibold text-gold inline-flex items-center justify-center gap-1.5 w-full"
            >
              {current.cta.label} <ChevronLeft className="w-3 h-3" />
            </Link>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-2 mt-5">
            {step > 0 && (
              <button
                onClick={prev}
                className="h-11 px-4 rounded-full bg-bg border border-border text-xs font-semibold inline-flex items-center justify-center gap-1.5 text-text-muted"
              >
                <ChevronRight className="w-3.5 h-3.5" /> חזור
              </button>
            )}
            <button
              onClick={next}
              className="flex-1 h-11 rounded-full bg-gold text-bg font-semibold text-sm inline-flex items-center justify-center gap-1.5"
            >
              {isLast ? (
                <><Check className="w-4 h-4" /> בואו נתחיל</>
              ) : (
                <>הבא ({step + 1}/{steps.length}) <ChevronLeft className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
