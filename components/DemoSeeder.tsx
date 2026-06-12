"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, X, Info } from "lucide-react";
import { seedDemo, resetDemo, isDemoSeeded } from "@/lib/demo-seed";

const BADGE_DISMISSED = "castit_demo_badge_dismissed_v1";

export function DemoSeeder() {
  const [showBadge, setShowBadge] = useState(false);
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Run seed on first mount (idempotent — won't override real data)
    seedDemo();
    // Show badge once unless dismissed
    if (!localStorage.getItem(BADGE_DISMISSED)) {
      const t = setTimeout(() => setShowBadge(true), 2500);
      return () => clearTimeout(t);
    }
  }, []);

  function dismissBadge() {
    if (typeof window !== "undefined") localStorage.setItem(BADGE_DISMISSED, "1");
    setShowBadge(false);
  }

  function handleReset() {
    if (!confirm("איפוס דמו — כל הפרויקטים, הטייפים והסשנים יוחלפו בנתוני דמו חדשים. להמשיך?")) return;
    resetDemo();
  }

  return (
    <>
      {/* Floating badge — bottom-right, gold */}
      <AnimatePresence>
        {showBadge && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-4 z-40 max-w-[300px]"
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => { setShowSheet(true); dismissBadge(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setShowSheet(true); dismissBadge(); } }}
              className="rounded-2xl bg-gold/95 backdrop-blur text-bg px-4 py-3 shadow-2xl flex items-center gap-2.5 text-right cursor-pointer"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest font-bold">דמו חי</div>
                <div className="text-xs font-semibold">לחץ למידע</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismissBadge(); }}
                className="ml-1 opacity-70"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo info sheet */}
      <AnimatePresence>
        {showSheet && (
          <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowSheet(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5 max-h-[85dvh] overflow-y-auto"
            >
              <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />

              <div className="flex items-center gap-2 mb-1">
                <div className="w-9 h-9 rounded-xl bg-gold/15 grid place-items-center">
                  <Sparkles className="w-5 h-5 text-gold" />
                </div>
                <h2 className="font-display text-2xl">דמו חי של CastIt</h2>
              </div>
              <p className="text-sm text-text-muted mb-4 leading-relaxed">
                הפלטפורמה מאוכלסת בנתוני דמו ריאליסטיים כדי שתראה את כל הזרימות עובדות.
              </p>

              <div className="rounded-2xl bg-bg border border-border p-4 space-y-2 text-xs">
                <div className="text-[10px] uppercase tracking-widest text-gold font-semibold mb-1">מה כלול בדמו</div>
                <Row label="3 פרויקטים" value="Feature Film, TV Series, Commercial (Quick Cast)" />
                <Row label="5 תפקידים" value="Lead, Support, Day-player, Background" />
                <Row label="13 submissions" value="פרושים בכל שלבי ה-pipeline" />
                <Row label="2 טייפים עם Aria Analysis" value="ניתוח AI מלא (mock)" />
                <Row label="1 Director Approval session" value="עם 2 טייפים, מוכן לקישור" />
                <Row label="Holds פעילים + דדליין שעבר" value="ה-Action Inbox מציג פעולות דחופות" />
              </div>

              <div className="rounded-2xl bg-plum/8 border border-plum/30 p-3 mt-3 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-plum-light shrink-0 mt-0.5" />
                <p className="text-[11px] text-text-muted leading-relaxed">
                  כל ה-AI עובד במצב fallback (Aria כותבת הודעות, מנתחת טייפים, מציעה directions) — בלי תלות במפתחות API.
                  למעבר לAI אמיתי, צריך להוסיף ANTHROPIC_API_KEY ב-Vercel.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={() => setShowSheet(false)}
                  className="h-12 rounded-2xl bg-bg border border-border text-sm font-semibold"
                >
                  המשך
                </button>
                <button
                  onClick={handleReset}
                  className="h-12 rounded-2xl bg-bg border border-gold/30 text-gold text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> אפס דמו
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="text-text-muted">{label}</span>
      <span className="text-text text-right">{value}</span>
    </div>
  );
}
