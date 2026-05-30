"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Camera, Check, Sparkles, Briefcase, Star } from "lucide-react";
import { useStore } from "@/lib/store";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { PhotoPicker } from "@/components/PhotoPicker";

type Role = "Talent" | "Casting Pro";
type Goal = "discovered" | "scenes" | "castings" | "network";

const GOALS: { id: Goal; label: string; emoji: string; desc: string }[] = [
  { id: "discovered", label: "Get discovered", emoji: "🌟", desc: "Show your reels to casting pros" },
  { id: "scenes",     label: "Practice scenes", emoji: "🎭", desc: "Sharpen your craft daily" },
  { id: "castings",   label: "Apply to roles",  emoji: "🎬", desc: "Match with paid opportunities" },
  { id: "network",    label: "Build a network", emoji: "💬", desc: "Connect with other creatives" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { setProfile, completeOnboarding } = useStore();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>("Talent");
  const [goals, setGoals] = useState<Set<Goal>>(new Set());
  const [photo, setPhoto] = useState<string | null>(null);

  function next() { haptic("light"); setStep((s) => s + 1); }
  function back() { haptic("light"); setStep((s) => s - 1); }

  function finish() {
    haptic("success");
    setProfile({ role, ...(photo ? { photoUrl: photo } : {}) });
    completeOnboarding();
    // Talents must complete their typecast — this is the core of the app
    router.replace(role === "Talent" ? "/typecast" : "/feed");
  }

  function onPhoto(file: File) {
    const url = URL.createObjectURL(file);
    setPhoto(url);
    setProfile({ photoUrl: url });
  }

  function toggleGoal(g: Goal) {
    const next = new Set(goals);
    if (next.has(g)) next.delete(g); else next.add(g);
    setGoals(next);
    haptic("light");
  }

  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      {/* Progress bar */}
      <div className="px-5 pt-6 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-1 rounded-full transition-all",
              i <= step ? "bg-gold" : "bg-bg-elevated"
            )}
          />
        ))}
      </div>

      <div className="flex-1 px-6 pt-10 pb-6 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            {step === 0 && (
              <>
                <div className="text-[11px] uppercase tracking-widest text-gold mb-2">
                  Step 1 of 3
                </div>
                <h1 className="font-display text-3xl tracking-editorial leading-[1.05]">
                  Who are you on <em className="text-gold-gradient not-italic">CastIt</em>?
                </h1>
                <p className="text-text-muted text-sm mt-2 mb-8">Pick the one that fits today — you can switch later.</p>

                <div className="grid grid-cols-1 gap-3">
                  <RoleCard
                    selected={role === "Talent"}
                    onClick={() => { setRole("Talent"); haptic("light"); }}
                    icon={<Star className="w-5 h-5" />}
                    title="Talent"
                    desc="Actor, model, creator. Post reels, get cast."
                    tone="gold"
                  />
                  <RoleCard
                    selected={role === "Casting Pro"}
                    onClick={() => { setRole("Casting Pro"); haptic("light"); }}
                    icon={<Briefcase className="w-5 h-5" />}
                    title="Casting Pro"
                    desc="Director, agent, producer. Discover talent."
                    tone="plum"
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="text-[11px] uppercase tracking-widest text-gold mb-2">
                  Step 2 of 3
                </div>
                <h1 className="font-display text-3xl tracking-editorial leading-[1.05]">
                  What are you here for?
                </h1>
                <p className="text-text-muted text-sm mt-2 mb-8">
                  Pick any — we'll tailor your feed.
                </p>

                <div className="space-y-2.5">
                  {GOALS.map((g) => {
                    const active = goals.has(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGoal(g.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all",
                          active
                            ? "border-gold bg-gold/10"
                            : "border-border bg-bg-elevated hover:border-border-strong"
                        )}
                      >
                        <span className="text-2xl">{g.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{g.label}</div>
                          <div className="text-xs text-text-muted mt-0.5">{g.desc}</div>
                        </div>
                        {active && (
                          <div className="w-6 h-6 rounded-full bg-gold grid place-items-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-bg" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="text-[11px] uppercase tracking-widest text-gold mb-2">
                  Step 3 of 3
                </div>
                <h1 className="font-display text-3xl tracking-editorial leading-[1.05]">
                  Add a face to the name
                </h1>
                <p className="text-text-muted text-sm mt-2 mb-10">
                  A profile photo boosts your discovery rate <span className="text-gold">5×</span>.
                </p>

                <div className="flex flex-col items-center">
                  <PhotoPicker
                    onPick={onPhoto}
                    cameraFacing="user"
                    title="הוסף תמונת פרופיל"
                    className="cursor-pointer"
                  >
                    {photo ? (
                      <img src={photo} alt="" className="w-40 h-40 rounded-full object-cover ring-4 ring-gold/30" />
                    ) : (
                      <div className="w-40 h-40 rounded-full bg-bg-elevated border-2 border-dashed border-border-strong grid place-items-center text-text-muted">
                        <div className="flex flex-col items-center gap-2">
                          <Camera className="w-7 h-7" />
                          <span className="text-xs">Tap to upload</span>
                        </div>
                      </div>
                    )}
                  </PhotoPicker>

                  {photo && (
                    <button
                      onClick={() => setPhoto(null)}
                      className="mt-4 text-xs text-text-muted underline"
                    >
                      Change photo
                    </button>
                  )}
                </div>

                <div className="mt-auto pt-8">
                  <div className="rounded-2xl p-4 bg-sage/8 border border-sage/20 flex gap-3">
                    <Sparkles className="w-4 h-4 text-sage shrink-0 mt-0.5" />
                    <p className="text-xs text-sage leading-relaxed">
                      You can skip this and add a photo later from your profile settings.
                    </p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        <div className="flex items-center gap-3 pt-6">
          {step > 0 && (
            <button
              onClick={back}
              className="w-12 h-12 rounded-full bg-bg-elevated border border-border grid place-items-center"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          {step < 2 ? (
            <button
              onClick={next}
              className="flex-1 h-12 rounded-2xl bg-gold text-bg font-semibold flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={finish}
              className="flex-1 h-12 rounded-2xl bg-gold text-bg font-semibold flex items-center justify-center gap-2"
            >
              {photo ? "Enter CastIt" : "Skip for now"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  selected, onClick, icon, title, desc, tone,
}: {
  selected: boolean; onClick: () => void; icon: React.ReactNode;
  title: string; desc: string; tone: "gold" | "plum";
}) {
  const ring = tone === "gold" ? "border-gold bg-gold/8" : "border-plum-light bg-plum/15";
  const iconBg = tone === "gold" ? "bg-gold/15 text-gold" : "bg-plum/30 text-plum-light";
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl border text-left transition-all flex items-center gap-4",
        selected ? ring + " ring-1 ring-inset ring-current" : "border-border bg-bg-elevated"
      )}
    >
      <div className={cn("w-11 h-11 rounded-xl grid place-items-center", iconBg)}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-display text-lg">{title}</div>
        <div className="text-xs text-text-muted mt-0.5">{desc}</div>
      </div>
      {selected && (
        <div className="w-6 h-6 rounded-full bg-gold grid place-items-center">
          <Check className="w-3.5 h-3.5 text-bg" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}
