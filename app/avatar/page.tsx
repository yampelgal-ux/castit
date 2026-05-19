"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { avatarFromTypecast } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export default function AvatarPage() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const signIn = useStore((s) => s.signIn);

  const baseSeed = profile.name || profile.username || "Star";
  const [seeds, setSeeds] = useState<string[]>(
    Array.from({ length: 6 }, (_, i) => `${baseSeed}-${i}`)
  );
  const [selected, setSelected] = useState(0);

  // All 6 variations share the same typecast, but different seeds give different
  // facial features (hair style picked from the hair-length bucket, mouth, eyes shape).
  const variants = useMemo(
    () => seeds.map((seed) => ({ seed, url: avatarFromTypecast(profile.typecast, seed) })),
    [seeds, profile.typecast]
  );

  function regenerate() {
    const r = Math.random().toString(36).slice(2, 6);
    setSeeds(Array.from({ length: 6 }, (_, i) => `${baseSeed}-${r}-${i}`));
  }

  function finish() {
    setProfile({ avatarSeed: variants[selected].seed });
    signIn();
    router.push("/feed");
  }

  return (
    <div className="min-h-dvh">
      <Header back title="Your avatar" />
      <div className="px-6 pt-4 pb-32">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet/10 text-violet text-[11px] font-medium">
          <Sparkles className="w-3 h-3" /> Generated from your typecast
        </div>

        <h2 className="font-display text-3xl mt-3 leading-tight">
          Meet your <span className="text-gold-gradient italic">double</span>.
        </h2>
        <p className="text-text-muted text-sm mt-1 max-w-sm">
          Built from the skin, eye and hair colors you locked in. Pick a variation that feels most like you.
        </p>

        {/* Featured */}
        <motion.div
          key={variants[selected].url}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="mt-8 mx-auto w-52 h-52 rounded-full p-1 bg-gradient-to-br from-gold via-violet to-gold"
        >
          <img
            src={variants[selected].url}
            alt=""
            className="w-full h-full rounded-full bg-bg-elevated"
          />
        </motion.div>

        {/* Typecast reflection note */}
        <div className="mt-4 px-4 py-2.5 rounded-xl bg-bg-elevated border border-border flex items-center gap-2 text-[11px] text-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-gold shrink-0" />
          <span>
            Skin: <span className="text-text">closest match</span> · Hair: <span className="text-text">{profile.typecast.hairLength || "Medium"}</span> · Eyes: <span className="text-text">matched</span>
          </span>
        </div>

        {/* Variants */}
        <div className="mt-8 flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-wider text-text-muted">Variations</span>
          <button
            onClick={regenerate}
            className="inline-flex items-center gap-1.5 text-xs text-gold hover:text-gold-light"
          >
            <RefreshCw className="w-3 h-3" /> Regenerate
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {variants.map((v, i) => (
            <button
              key={v.seed}
              onClick={() => setSelected(i)}
              className={cn(
                "aspect-square rounded-2xl p-2 border-2 transition-all",
                selected === i ? "border-gold bg-gold/5" : "border-border bg-bg-elevated"
              )}
            >
              <img src={v.url} alt="" className="w-full h-full rounded-xl" />
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 max-w-[440px] mx-auto p-4 glass border-t border-border">
        <button
          onClick={finish}
          className="w-full h-14 rounded-2xl bg-gold text-bg font-semibold hover:bg-gold-light flex items-center justify-center gap-2"
        >
          Enter CastIt <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
