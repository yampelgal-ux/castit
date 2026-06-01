"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Brand } from "@/components/Brand";
import { ArrowRight, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

export default function WelcomePage() {
  const { t, dir } = useT();
  return (
    <div className="relative min-h-dvh overflow-hidden noise">
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&q=80"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="https://assets.mixkit.co/videos/4937/4937-720.mp4" type="video/mp4" />
      </video>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/60 to-bg" />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-dvh px-7 pt-16 pb-10">
        {/* Language toggle — top corner */}
        <div className="absolute top-5 right-5 z-20">
          <LanguageToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-elevated/60 backdrop-blur border border-border text-xs text-text-muted" dir={dir}>
            <Sparkles className="w-3 h-3 text-gold" />
            {t("welcome.eyebrow")}
          </div>
        </motion.div>

        <div className="flex-1 flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <Brand size="xl" className="leading-[0.95] block" />
            <p className="mt-6 text-2xl font-display leading-snug text-text" dir={dir}>
              {t("welcome.tagline1")} <em className="text-gold-gradient not-italic">{t("welcome.tagline2")}</em>.
            </p>
            <p className="mt-3 text-text-muted text-[15px] leading-relaxed max-w-sm" dir={dir}>
              {t("welcome.sub")}
            </p>

            <div className="mt-5 flex items-center gap-2" dir={dir}>
              <div className="flex -space-x-2">
                <img src="https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=80&q=80&auto=format&fit=crop" alt="" className="w-7 h-7 rounded-full object-cover border-2 border-bg" />
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80&auto=format&fit=crop" alt="" className="w-7 h-7 rounded-full object-cover border-2 border-bg" />
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&q=80&auto=format&fit=crop" alt="" className="w-7 h-7 rounded-full object-cover border-2 border-bg" />
              </div>
              <p className="text-[11px] text-text-muted">
                <span className="text-text font-semibold">48,000+</span> {t("welcome.joined")}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 space-y-3"
          >
            <Link
              href="/signup"
              className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-gold text-bg font-semibold hover:bg-gold-light transition-colors group"
            >
              {t("welcome.getStarted")}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/feed"
              className="flex items-center justify-center w-full h-14 rounded-2xl bg-bg-elevated/60 backdrop-blur border border-border text-text font-medium"
            >
              {t("welcome.haveAccount")}
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-5"
          >
            <Link
              href="/pro"
              className="block text-center text-[11px] text-text-subtle leading-relaxed hover:text-text-muted"
            >
              {t("welcome.proLine1")} · <span className="text-gold font-semibold">CastIt Pro →</span>
            </Link>
          </motion.div>

          <p className="mt-3 text-center text-[11px] text-text-subtle leading-relaxed">
            By continuing you agree to our Terms of Service & Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
