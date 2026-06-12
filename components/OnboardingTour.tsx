"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Search, Inbox, Wand2, ChevronLeft, ChevronRight,
  Check, Zap, ClipboardCheck, Camera,
} from "lucide-react";
import { useT } from "@/lib/i18n";

const KEY = "castit_onboarding_done_v1";

type Step = {
  icon: typeof Sparkles;
  tone: "gold" | "plum" | "sage";
  titleKey: string;
  bodyKey: string;
  cta?: { labelKey: string; href: string };
};

const TALENT_STEPS: Step[] = [
  { icon: Sparkles, tone: "gold", titleKey: "tour.t1.title", bodyKey: "tour.t1.body" },
  { icon: Camera,   tone: "gold", titleKey: "tour.t2.title", bodyKey: "tour.t2.body", cta: { labelKey: "tour.t2.cta", href: "/inbox" } },
  { icon: Wand2,    tone: "plum", titleKey: "tour.t3.title", bodyKey: "tour.t3.body", cta: { labelKey: "tour.t3.cta", href: "/studio/coach" } },
  { icon: Search,   tone: "sage", titleKey: "tour.t4.title", bodyKey: "tour.t4.body", cta: { labelKey: "tour.t4.cta", href: "/typecast" } },
];

const PRO_STEPS: Step[] = [
  { icon: Sparkles,        tone: "gold", titleKey: "tour.p1.title", bodyKey: "tour.p1.body" },
  { icon: Inbox,           tone: "gold", titleKey: "tour.p2.title", bodyKey: "tour.p2.body", cta: { labelKey: "tour.p2.cta", href: "/pro/inbox" } },
  { icon: Zap,             tone: "plum", titleKey: "tour.p3.title", bodyKey: "tour.p3.body", cta: { labelKey: "tour.p3.cta", href: "/pro/triage" } },
  { icon: Wand2,           tone: "plum", titleKey: "tour.p4.title", bodyKey: "tour.p4.body", cta: { labelKey: "tour.p4.cta", href: "/pro/projects" } },
  { icon: ClipboardCheck,  tone: "sage", titleKey: "tour.p5.title", bodyKey: "tour.p5.body", cta: { labelKey: "tour.p5.cta", href: "/pro/approvals" } },
];

export function OnboardingTour() {
  const pathname = usePathname();
  const { t, dir } = useT();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Detect mode (pro vs talent) from URL
  const isPro = pathname?.startsWith("/pro") ?? false;
  const steps = isPro ? PRO_STEPS : TALENT_STEPS;
  // Forward/back arrows mirror in RTL
  const ForwardChevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const BackChevron = dir === "rtl" ? ChevronRight : ChevronLeft;

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
            {t("tour.skip")}
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
          <h2 className="font-display text-2xl tracking-editorial text-center">{t(current.titleKey)}</h2>
          <p className="text-sm text-text-muted text-center mt-2 leading-relaxed">
            {t(current.bodyKey)}
          </p>

          {/* Optional CTA */}
          {current.cta && (
            <Link
              href={current.cta.href}
              onClick={dismiss}
              className="block mt-4 h-10 rounded-full bg-bg border border-gold/30 text-xs font-semibold text-gold inline-flex items-center justify-center gap-1.5 w-full"
            >
              {t(current.cta.labelKey)} <ForwardChevron className="w-3 h-3" />
            </Link>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-2 mt-5">
            {step > 0 && (
              <button
                onClick={prev}
                className="h-11 px-4 rounded-full bg-bg border border-border text-xs font-semibold inline-flex items-center justify-center gap-1.5 text-text-muted"
              >
                <BackChevron className="w-3.5 h-3.5" /> {t("tour.back")}
              </button>
            )}
            <button
              onClick={next}
              className="flex-1 h-11 rounded-full bg-gold text-bg font-semibold text-sm inline-flex items-center justify-center gap-1.5"
            >
              {isLast ? (
                <><Check className="w-4 h-4" /> {t("tour.lets")}</>
              ) : (
                <>{t("tour.next", { n: step + 1, total: steps.length })} <ForwardChevron className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
