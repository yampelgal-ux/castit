"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, Search, Megaphone, Users, ArrowRight, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function ProLandingPage() {
  const { lang } = useT();
  const L = (he: string, en: string) => (lang === "he" ? he : en);
  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg noise">
      {/* Backdrop */}
      <div className="absolute inset-0 opacity-60">
        <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-plum/30 blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-wine/20 blur-3xl" />
      </div>

      <div className="relative z-10 min-h-dvh flex flex-col px-6 pt-14 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-bg-elevated/60 backdrop-blur border border-plum-light/30 text-[0.6875rem] text-plum-light"
        >
          <Sparkles className="w-3 h-3" /> {L("כניסה לאנשי מקצוע", "Industry Access")}
        </motion.div>

        <div className="flex-1 flex flex-col justify-center mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="font-display text-[42px] leading-[0.95] tracking-editorial">
              {lang === "he" ? (
                <><em className="text-gold-gradient not-italic">הפנים הנכונות</em><br />לכל תפקיד.</>
              ) : (
                <>Cast the right <em className="text-gold-gradient not-italic">face</em><br />for the role.</>
              )}
            </h1>
            <p className="mt-4 text-text-muted text-[0.9375rem] leading-relaxed max-w-sm">
              {L("CastIt Pro נותן למלהקים, במאים וסוכנים חיפוש מדויק בין פרופילים של שחקנים, ניהול אודישנים מקצה לקצה, וקו ישיר לשחקנים.",
                "CastIt Pro gives directors, agents and casting professionals a precision search across talent profiles, end-to-end audition management, and a direct line to talent.")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 grid grid-cols-1 gap-2.5"
          >
            <Feature icon={Search} title={L("חיפוש לפי טייפקאסט", "Typecast search")} desc={L("סינון לפי יותר מ-30 מאפיינים: מראה, כישורים, שפות, ניסיון ועוד.", "Filter by 30+ look, skill, language and career attributes.")} />
            <Feature icon={Megaphone} title={L("פרסום אודישנים", "Post auditions")} desc={L("לכל השחקנים, או רק למי שמתאים לתפקיד.", "Reach the whole talent pool, or just matching profiles.")} />
            <Feature icon={Users} title={L("ניהול מגישים", "Manage applicants")} desc={L("ציוני התאמה, מיון, רשימה קצרה והודעות.", "See match scores, sort, shortlist, and message.")} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2.5"
        >
          <Link
            href="/pro/signup"
            className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-gold text-on-accent font-semibold group"
          >
            {L("פתיחת חשבון מלהקים", "Open a Pro account")}
            <ArrowRight className="w-4 h-4 transition-transform rtl:rotate-180" />
          </Link>
          <Link
            href="/pro/login"
            className="flex items-center justify-center w-full h-14 rounded-2xl bg-bg-elevated/70 backdrop-blur border border-plum-light/20 text-text font-medium"
          >
            {L("כבר יש לי חשבון", "I already have a Pro account")}
          </Link>
          <Link
            href="/welcome"
            className="block text-center text-[0.6875rem] text-text-subtle pt-3 hover:text-text-muted"
          >
            {L("לא מלהקים? למעבר לצד השחקנים ←", "Not a casting pro? Switch to talent →")}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-2xl bg-bg-elevated/60 backdrop-blur border border-border">
      <div className="w-9 h-9 rounded-xl bg-plum/25 text-plum-light grid place-items-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[0.6875rem] text-text-muted mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
