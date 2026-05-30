"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Users, FileVideo, Wand2, Zap, BarChart3,
  ClipboardCheck, Mic, Camera, Globe, ArrowRight, ArrowLeft, Play, Pause,
  X, Inbox, MessageCircle, Award, Eye,
} from "lucide-react";

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  tone: "gold" | "plum" | "sage" | "violet";
  visual: React.ReactNode;
  cta?: { label: string; href: string };
  metric?: { value: string; label: string };
};

const SLIDES: Slide[] = [
  // ─── Cover ─────────────────────────────────────────
  {
    id: "cover",
    eyebrow: "Where talent meets opportunity",
    title: "CastIt",
    body: "הפלטפורמה הראשונה שמחברת שחקנים, מלהקים וסוכנויות בתהליך אחד מקצה לקצה — עם AI בלב.",
    tone: "gold",
    visual: (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-4">
          <div className="font-display text-[120px] leading-none">
            Cast<span className="text-gold">It</span>
          </div>
        </div>
        <div className="text-center text-xs text-text-muted uppercase tracking-[0.3em]">
          Demo · Live Build · 2026
        </div>
      </div>
    ),
  },

  // ─── Problem ───────────────────────────────────────
  {
    id: "problem",
    eyebrow: "השוק",
    title: "$4.2B שמנוהל ב-WhatsApp",
    body: "תעשיית הליהוק עובדת על מיילים, גיליונות ושיחות. אין פלטפורמה אחת שמנהלת את כל התהליך — מההזמנה הראשונית ועד החתימה.",
    tone: "plum",
    visual: (
      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
        <Stat value="$4.2B" label="שוק גלובלי" />
        <Stat value="85%" label="self-tape" />
        <Stat value="0" label="פתרונות שלמים" />
      </div>
    ),
  },

  // ─── Talent side ───────────────────────────────────
  {
    id: "talent",
    eyebrow: "צד הטאלנט",
    title: "כל תהליך האודישן בכיס",
    body: "Audition Inbox עם כל ההזמנות שלך. Self-tape Studio עם sides על המסך. Aria — AI מאמן אישי שעובד 24/7.",
    tone: "gold",
    visual: <TalentVisual />,
    cta: { label: "Audition Inbox", href: "/inbox" },
  },

  // ─── Self-tape ─────────────────────────────────────
  {
    id: "self-tape",
    eyebrow: "Self-tape Studio",
    title: "הקלטה, העלאה, ניתוח AI",
    body: "מקליטים בתוך האפליקציה עם sides על המסך — או מעלים קובץ ממצלמה מקצועית. Aria מנתחת כל טייפ ונותנת ציון slate, דיוק שורות, וקצב.",
    tone: "violet",
    visual: <SelfTapeVisual />,
  },

  // ─── Coach ─────────────────────────────────────────
  {
    id: "coach",
    eyebrow: "AI Coach",
    title: "אימון עם שותף וירטואלי",
    body: "מעלים סצנה (תמונה, טקסט או PDF) → בוחרים את התפקיד שלך, את הקול והטונציה של השותף → מתאמנים. Aria משחקת איתך את הסצנה, מקליטה את הביצוע שלך, שומרת בספרייה.",
    tone: "plum",
    visual: <CoachVisual />,
    cta: { label: "AI Coach", href: "/studio/coach" },
  },

  // ─── Pro side ──────────────────────────────────────
  {
    id: "pro",
    eyebrow: "צד המלהק",
    title: "Pipeline מלא של 8 שלבים",
    body: "Action Inbox מאוחד · Tape Triage עם swipe · ניהול callback פרונטלי או tape · Hold timer · Director Approval · Pro Analytics.",
    tone: "gold",
    visual: <ProVisual />,
    cta: { label: "Pro Dashboard", href: "/pro/dashboard" },
  },

  // ─── Aria AI ───────────────────────────────────────
  {
    id: "aria",
    eyebrow: "Aria — AI שעובד לשני הצדדים",
    title: "8 endpoints. אינסוף שעות חיסכון.",
    body: "מנתחת טייפים. מנסחת הודעות ל-callback / hold / pass בעברית. פותחת casting breakdown מתמונה לכל התפקידים. כותבת הוראות בימוי לפני הקלטה. מדברת בקול AI טבעי.",
    tone: "violet",
    visual: <AriaVisual />,
  },

  // ─── Business model ────────────────────────────────
  {
    id: "model",
    eyebrow: "מודל עסקי",
    title: "מלהקים חינם. השאר משלמים.",
    body: "Free for pros = supply guaranteed. ₪29-99/חודש לשחקנים על AI ונראות. ₪499-1,200/חודש לסוכנויות לשמור רלוונטיות. 86% גרוס מרג'ין.",
    tone: "sage",
    visual: <ModelVisual />,
  },

  // ─── CTA ───────────────────────────────────────────
  {
    id: "cta",
    eyebrow: "Live. Working. Now.",
    title: "תתחיל לחקור",
    body: "האפליקציה חיה באוויר עם נתוני דמו מלאים. כל הפיצ'רים שראית — אמיתיים ועובדים.",
    tone: "gold",
    visual: <FinalCTA />,
  },
];

const TONE_BG: Record<Slide["tone"], string> = {
  gold:   "from-gold/20 via-bg to-bg",
  plum:   "from-plum/20 via-bg to-bg",
  sage:   "from-sage/20 via-bg to-bg",
  violet: "from-violet/20 via-bg to-bg",
};

const TONE_ACCENT: Record<Slide["tone"], string> = {
  gold:   "text-gold",
  plum:   "text-plum-light",
  sage:   "text-sage",
  violet: "text-violet",
};

const AUTOPLAY_MS = 7000;

export default function TourPage() {
  const [idx, setIdx] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  function next() { setIdx((i) => Math.min(SLIDES.length - 1, i + 1)); }
  function prev() { setIdx((i) => Math.max(0, i - 1)); }

  useEffect(() => {
    if (!autoplay) return;
    if (isLast) return;
    const t = setTimeout(next, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [idx, autoplay, isLast]);

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") setAutoplay(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`min-h-dvh bg-gradient-to-br ${TONE_BG[slide.tone]} relative overflow-hidden`}>
      {/* Decorative blurs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gold/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-plum/10 blur-[120px] pointer-events-none" />

      {/* Exit + autoplay */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <Link
          href="/welcome"
          className="w-9 h-9 rounded-full bg-bg-elevated/80 backdrop-blur border border-border grid place-items-center text-text-muted hover:text-text"
          aria-label="Exit tour"
        >
          <X className="w-4 h-4" />
        </Link>
        <button
          onClick={() => setAutoplay((a) => !a)}
          className={`h-9 px-3 rounded-full backdrop-blur border text-[11px] font-semibold inline-flex items-center gap-1.5 ${
            autoplay
              ? "bg-gold/20 border-gold/40 text-gold"
              : "bg-bg-elevated/80 border-border text-text-muted"
          }`}
        >
          {autoplay ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Auto-play</>}
        </button>
      </div>

      {/* Progress dots */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-1 rounded-full transition-all ${
              i === idx ? "w-8 bg-gold" : i < idx ? "w-1.5 bg-gold/40" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 text-[10px] uppercase tracking-widest text-text-muted tnum">
        {idx + 1} / {SLIDES.length}
      </div>

      {/* Slide */}
      <div className="relative z-10 min-h-dvh flex items-center justify-center px-6 py-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl w-full text-center space-y-6"
          >
            {/* Eyebrow */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-elevated/60 backdrop-blur border border-border text-[10px] uppercase tracking-[0.3em] ${TONE_ACCENT[slide.tone]} font-semibold`}>
              <Sparkles className="w-2.5 h-2.5" />
              {slide.eyebrow}
            </div>

            {/* Title */}
            <h1 className={`font-display tracking-editorial leading-[1.05] ${
              slide.id === "cover" ? "text-[88px] sm:text-[120px]" : "text-4xl sm:text-5xl"
            }`}>
              {slide.title}
            </h1>

            {/* Body */}
            <p className="text-base sm:text-lg text-text-muted leading-relaxed max-w-xl mx-auto">
              {slide.body}
            </p>

            {/* Visual */}
            <div className="pt-4">
              {slide.visual}
            </div>

            {/* Optional deep-link CTA */}
            {slide.cta && (
              <Link
                href={slide.cta.href}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-bg-elevated border border-gold/30 text-gold text-sm font-semibold hover:bg-gold/10 transition-colors"
              >
                {slide.cta.label} <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav arrows */}
      <button
        onClick={prev}
        disabled={idx === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-bg-elevated/80 backdrop-blur border border-border grid place-items-center text-text disabled:opacity-30 hover:bg-bg-elevated"
        aria-label="Previous"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <button
        onClick={next}
        disabled={isLast}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-gold text-bg grid place-items-center disabled:opacity-40"
        aria-label="Next"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Visual primitives ─────────────────────────────────
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-bg-elevated/60 backdrop-blur border border-border p-4">
      <div className="font-display text-3xl font-bold text-gold tnum">{value}</div>
      <div className="text-[10px] text-text-muted uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[260px] rounded-[28px] bg-bg-elevated border-2 border-border/60 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden p-2.5">
      <div className="rounded-[20px] bg-bg overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function TalentVisual() {
  return (
    <PhoneFrame>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Inbox className="w-3.5 h-3.5 text-gold" />
          <span className="text-[10px] uppercase tracking-widest text-gold font-semibold">Auditions</span>
        </div>
        {[
          { p: "After the Rain", r: "Maya — Lead", urgent: true, days: "2d" },
          { p: "The Wave Below", r: "Det. Ben", urgent: false, days: "5d" },
        ].map((a, i) => (
          <div key={i} className={`rounded-xl border p-2.5 ${a.urgent ? "bg-gold/10 border-gold/40" : "bg-bg-elevated border-border"}`}>
            <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">{a.p}</div>
            <div className="text-xs font-semibold mt-0.5">{a.r}</div>
            <div className="text-[9px] text-text-muted mt-0.5">Due in {a.days}</div>
          </div>
        ))}
      </div>
    </PhoneFrame>
  );
}

function SelfTapeVisual() {
  return (
    <PhoneFrame>
      <div className="aspect-[9/16] bg-gradient-to-b from-black via-gray-900 to-black relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80')] bg-cover bg-center opacity-40" />
        <div className="absolute top-3 left-3 right-3 rounded-lg bg-black/70 backdrop-blur p-2">
          <div className="text-[9px] uppercase tracking-widest text-gold">Sides</div>
          <div className="text-[9px] text-white mt-0.5">MAYA: I told you I'm not doing it.</div>
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-danger grid place-items-center">
          <div className="w-5 h-5 bg-white rounded-full" />
        </div>
        <div className="absolute bottom-3 left-3 w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/30 grid place-items-center">
          <Camera className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
    </PhoneFrame>
  );
}

function CoachVisual() {
  return (
    <PhoneFrame>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="w-3.5 h-3.5 text-plum-light" />
          <span className="text-[10px] uppercase tracking-widest text-plum-light font-semibold">Aria · Scene Partner</span>
        </div>
        <div className="flex justify-start">
          <div className="bg-bg-elevated border border-border rounded-2xl rounded-bl-md px-3 py-2 max-w-[80%]">
            <div className="text-[9px] text-gold uppercase tracking-widest font-semibold">DAVID</div>
            <div className="text-[11px] mt-0.5">It's not about you anymore.</div>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-gold text-bg rounded-2xl rounded-br-md px-3 py-2 max-w-[80%]">
            <div className="text-[9px] text-bg/60 uppercase tracking-widest font-semibold">MAYA · אני</div>
            <div className="text-[11px] mt-0.5">It was never about me.</div>
          </div>
        </div>
        <div className="rounded-xl bg-gold/8 border border-gold/30 p-2 mt-2">
          <div className="text-[9px] uppercase tracking-widest text-gold font-semibold">Aria's direction</div>
          <div className="text-[10px] mt-1 text-text">restraint, not anger. let it land.</div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function ProVisual() {
  return (
    <PhoneFrame>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-3.5 h-3.5 text-gold" />
          <span className="text-[10px] uppercase tracking-widest text-gold font-semibold">Action Inbox</span>
        </div>
        <div className="rounded-xl bg-danger/10 border border-danger/40 p-2">
          <div className="text-[9px] uppercase tracking-widest text-danger font-semibold">⚡ Hold expiring</div>
          <div className="text-[11px] font-semibold mt-0.5">Maya Levi · 12h left</div>
        </div>
        <div className="rounded-xl bg-gold/10 border border-gold/40 p-2">
          <div className="text-[9px] uppercase tracking-widest text-gold font-semibold">📼 To review</div>
          <div className="text-[11px] font-semibold mt-0.5">3 new tapes from today</div>
        </div>
        <div className="rounded-xl bg-plum/10 border border-plum/40 p-2">
          <div className="text-[9px] uppercase tracking-widest text-plum-light font-semibold">👥 Director vote</div>
          <div className="text-[11px] font-semibold mt-0.5">1/2 voted — waiting on producer</div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function AriaVisual() {
  const features = [
    { icon: FileVideo, label: "Tape Analysis", tone: "text-gold" },
    { icon: MessageCircle, label: "Comm Automation", tone: "text-sage" },
    { icon: Wand2, label: "Scene Coach", tone: "text-plum-light" },
    { icon: Eye, label: "Bulk Roles Parser", tone: "text-violet" },
    { icon: Mic, label: "Premium Voice", tone: "text-gold" },
    { icon: ClipboardCheck, label: "Director Notes", tone: "text-sage" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
      {features.map((f, i) => (
        <div key={i} className="rounded-xl bg-bg-elevated/60 backdrop-blur border border-border p-3 text-center">
          <f.icon className={`w-4 h-4 ${f.tone} mx-auto`} />
          <div className="text-[10px] text-text mt-1.5 leading-tight">{f.label}</div>
        </div>
      ))}
    </div>
  );
}

function ModelVisual() {
  return (
    <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
      <div className="rounded-2xl bg-sage/10 border border-sage/30 p-4 text-center">
        <Users className="w-5 h-5 text-sage mx-auto mb-2" />
        <div className="font-display text-2xl font-bold text-sage tnum">₪0</div>
        <div className="text-[10px] text-text mt-1">מלהקים · Free forever</div>
      </div>
      <div className="rounded-2xl bg-gold/10 border border-gold/30 p-4 text-center">
        <Sparkles className="w-5 h-5 text-gold mx-auto mb-2" />
        <div className="font-display text-2xl font-bold text-gold tnum">₪29-99</div>
        <div className="text-[10px] text-text mt-1">שחקנים · חודש</div>
      </div>
      <div className="rounded-2xl bg-plum/10 border border-plum/30 p-4 text-center">
        <Award className="w-5 h-5 text-plum-light mx-auto mb-2" />
        <div className="font-display text-2xl font-bold text-plum-light tnum">₪499+</div>
        <div className="text-[10px] text-text mt-1">סוכנויות · חודש</div>
      </div>
    </div>
  );
}

function FinalCTA() {
  return (
    <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
      <Link
        href="/welcome"
        className="w-full h-14 rounded-2xl bg-gold text-bg font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <Globe className="w-4 h-4" /> כניסה לאפליקציה
      </Link>
      <div className="grid grid-cols-2 gap-2 w-full">
        <Link
          href="/inbox"
          className="h-11 rounded-2xl bg-bg-elevated border border-border text-sm font-semibold inline-flex items-center justify-center gap-1.5"
        >
          <Inbox className="w-3.5 h-3.5" /> Talent
        </Link>
        <Link
          href="/pro/dashboard"
          className="h-11 rounded-2xl bg-bg-elevated border border-border text-sm font-semibold inline-flex items-center justify-center gap-1.5"
        >
          <BarChart3 className="w-3.5 h-3.5" /> Pro
        </Link>
      </div>
      <div className="text-[10px] text-text-subtle mt-2">
        Vercel · Free tier · No credit card required
      </div>
    </div>
  );
}
