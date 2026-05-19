"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, Search, Megaphone, Users, ArrowRight, Sparkles } from "lucide-react";

export default function ProLandingPage() {
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
          className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-bg-elevated/60 backdrop-blur border border-plum-light/30 text-[11px] text-plum-light"
        >
          <Sparkles className="w-3 h-3" /> Industry Access
        </motion.div>

        <div className="flex-1 flex flex-col justify-center mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="font-display text-[42px] leading-[0.95] tracking-editorial">
              Cast the right <em className="text-gold-gradient not-italic">face</em><br />
              for the role.
            </h1>
            <p className="mt-4 text-text-muted text-[15px] leading-relaxed max-w-sm">
              CastIt Pro gives directors, agents and casting professionals a precision search across thousands of verified talent profiles — and a direct line to post auditions.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 grid grid-cols-1 gap-2.5"
          >
            <Feature icon={Search} title="Typecast search" desc="Filter by 15+ physical, performance and career attributes." />
            <Feature icon={Megaphone} title="Post auditions" desc="Reach the whole talent pool — or just matching profiles." />
            <Feature icon={Users} title="Manage applicants" desc="See match scores, sort, shortlist, and message." />
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
            className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-gold text-bg font-semibold group"
          >
            Open a Pro account
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/pro/login"
            className="flex items-center justify-center w-full h-14 rounded-2xl bg-bg-elevated/70 backdrop-blur border border-plum-light/20 text-text font-medium"
          >
            I already have a Pro account
          </Link>
          <Link
            href="/welcome"
            className="block text-center text-[11px] text-text-subtle pt-3 hover:text-text-muted"
          >
            Not a casting pro? Switch to talent →
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
        <div className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
