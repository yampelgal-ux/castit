"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mic, Wand2, X, Zap } from "lucide-react";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const HIDDEN = ["/studio/agent", "/practice", "/onboarding", "/welcome", "/signup", "/login"];

export function AriaFAB() {
  const pathname = usePathname() || "";
  const role = useStore((s) => s.profile.role);
  const ariaCredits = useStore((s) => s.ariaCredits);
  const [open, setOpen] = useState(false);

  if (HIDDEN.some((p) => pathname.startsWith(p))) return null;
  if (pathname.startsWith("/pro")) return null;

  const lowCredits = ariaCredits <= 5;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="fixed bottom-32 right-4 z-50 max-w-[440px] w-[290px] rounded-2xl bg-bg-elevated border border-gold/30 shadow-[0_12px_48px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{ right: "max(1rem, calc((100vw - 440px)/2 + 1rem))" }}
          >
            <div className="px-4 pt-3.5 pb-2 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">Quick actions</div>
                <div className="font-display text-sm">
                  What does {role === "Casting Pro" ? "your team" : "your agent"} need?
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-bg-muted grid place-items-center text-text-muted"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Credits display */}
            <div className={cn(
              "mx-3 mt-2 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[11px]",
              lowCredits ? "bg-danger/10 border border-danger/20" : "bg-gold/8 border border-gold/15"
            )}>
              <Zap className={cn("w-3 h-3", lowCredits ? "text-danger" : "text-gold")} />
              <span className={cn(lowCredits ? "text-danger" : "text-gold")}>
                <span className="font-bold tnum">{ariaCredits}</span>
                {" "}Aria credits remaining
              </span>
              {lowCredits && (
                <Link href="/studio/agent" className="ml-auto text-[10px] text-gold font-semibold underline">
                  Top up
                </Link>
              )}
            </div>

            <div className="p-2 pt-1.5">
              <FabAction href="/studio/agent" icon={Sparkles} title="Chat with Aria" sub="Casting strategy · negotiations · scheduling" onClose={() => setOpen(false)} />
              <FabAction href="/practice" icon={Mic} title="Practice an audition" sub="AI scene partner — record yourself live" onClose={() => setOpen(false)} />
              <FabAction href="/studio" icon={Wand2} title="Open Studio" sub="Scene library · reel upload" onClose={() => setOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The FAB */}
      <motion.button
        onClick={() => { setOpen((o) => !o); haptic("light"); }}
        whileTap={{ scale: 0.92 }}
        animate={open ? { rotate: 90 } : { rotate: 0 }}
        className={cn(
          "fixed z-50 w-14 h-14 rounded-full grid place-items-center",
          "bg-gradient-to-br from-gold via-gold to-wine text-bg",
          "shadow-[0_8px_24px_rgba(212,165,116,0.45)]",
          "border border-gold-light/40"
        )}
        style={{
          bottom: "max(6rem, calc(env(safe-area-inset-bottom) + 6rem))",
          right: "max(1rem, calc((100vw - 440px)/2 + 1rem))",
        }}
        aria-label="Open Aria assistant"
      >
        <span className="absolute inset-0 rounded-full bg-gold/40 animate-ping opacity-30" />
        <Sparkles className="w-6 h-6 relative" />

        {/* Credit badge */}
        <span className={cn(
          "absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full text-[9px] font-bold grid place-items-center px-1 border-2 border-bg",
          lowCredits ? "bg-danger text-white" : "bg-bg-elevated text-gold border-gold/30"
        )}>
          {ariaCredits > 99 ? "99+" : ariaCredits}
        </span>
      </motion.button>
    </>
  );
}

function FabAction({
  href, icon: Icon, title, sub, onClose,
}: {
  href: string; icon: React.ElementType; title: string; sub: string; onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={() => { onClose(); haptic("medium"); }}
      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-bg-muted transition-colors"
    >
      <div className="w-9 h-9 rounded-lg bg-gold/15 grid place-items-center text-gold shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[10px] text-text-muted truncate">{sub}</div>
      </div>
    </Link>
  );
}
