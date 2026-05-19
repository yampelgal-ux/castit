"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ShieldCheck, Camera } from "lucide-react";
import { useStore } from "@/lib/store";
import { SKIN_TONES, EYE_COLORS, HAIR_COLORS } from "@/lib/typecast-palette";
import { TypecastPicker } from "@/components/TypecastPicker";
import { cn } from "@/lib/utils";

const LANGUAGES = ["Hebrew", "English", "Arabic", "Russian", "French", "Spanish", "German", "Italian"];
const SKILLS = ["Stage Combat", "Singing", "Dance", "Improv", "Horseback Riding", "Martial Arts", "Piano", "Guitar", "Driving (Stick)", "Surfing", "Skateboarding", "Dialects"];
const GENRES = ["Drama", "Comedy", "Thriller", "Action", "Romance", "Indie", "Period", "Horror", "Musical", "Commercial"];

const STEPS = ["Physical", "Appearance", "Skills", "Range"] as const;

export default function TypecastPage() {
  const router = useRouter();
  const { setTypecast, setProfile, signIn, profile } = useStore();
  const [step, setStep] = useState(0);
  const [tc, setTc] = useState({
    heightCm: 175,
    weightKg: 65,
    gender: "Female",
    skinTone: "#E0BB92",
    eyeColor: "#5A3520",
    hairColor: "#3A2418",
    hairLength: "Medium",
    languages: ["Hebrew", "English"],
    skills: [] as string[],
    ageRangeMin: 22,
    ageRangeMax: 32,
    genres: [] as string[],
  });

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else {
      setTypecast(tc);
      signIn();
      router.replace("/feed");
    }
  }

  function back() {
    if (step === 0) router.back();
    else setStep(step - 1);
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setProfile({ photoUrl: url });
  }

  // Photo block visible on physical/appearance steps
  const showPhoto = step <= 1;
  const initials = (profile.name || profile.username || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-40 glass border-b border-border">
        <div className="px-4 h-14 flex items-center justify-between">
          <button onClick={back} className="-ml-2 p-2 rounded-full hover:bg-bg-elevated">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs text-text-muted tnum">Step {step + 1} of {STEPS.length}</span>
          <div className="w-9" />
        </div>
        <div className="h-0.5 bg-border">
          <motion.div
            className="h-full bg-gold"
            initial={false}
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      {/* Mandatory ID notice */}
      <div className="px-6 pt-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gold/8 border border-gold/20 text-[11px] text-gold">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Your typecast is your casting ID — required for verification</span>
        </div>
      </div>

      <div className="flex-1 px-6 pt-4 pb-32 overflow-y-auto">
        {/* Real profile photo — shown for physical/appearance steps */}
        <AnimatePresence>
          {showPhoto && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-bg-elevated border border-border overflow-hidden"
            >
              <label className="relative cursor-pointer shrink-0">
                <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
                {profile.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt={profile.name || "You"}
                    className="w-20 h-20 rounded-2xl object-cover border border-gold/30"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-bg border-2 border-dashed border-border-strong grid place-items-center font-display text-2xl text-gold">
                    {initials}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gold text-bg grid place-items-center shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
                  <Camera className="w-3 h-3" />
                </span>
              </label>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-gold mb-1">
                  Your profile photo
                </div>
                <div className="text-sm font-medium leading-snug">
                  {profile.photoUrl ? "This is what casting pros will see." : "Tap to upload — needed for verification."}
                </div>
                <div className="text-[11px] text-text-muted mt-1">
                  Use a clear, recent headshot.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-[11px] uppercase tracking-widest text-gold mb-2">{STEPS[step]}</div>
        <h2 className="font-display text-3xl leading-tight mb-1">
          {step === 0 && "The physical basics."}
          {step === 1 && "Your look."}
          {step === 2 && "Your craft."}
          {step === 3 && "Your range."}
        </h2>
        <p className="text-text-muted text-sm mb-7">
          {step === 0 && "Casting pros filter by these exact stats."}
          {step === 1 && "Pick what's closest. Real reference visuals — not flat colors."}
          {step === 2 && "Be honest — it's what makes you castable."}
          {step === 3 && "Tell us what you can play and love to do."}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            {step === 0 && (
              <>
                <Slider label="Height" value={tc.heightCm} min={140} max={210} unit="cm" onChange={(v) => setTc({ ...tc, heightCm: v })} />
                <Slider label="Weight" value={tc.weightKg} min={40} max={130} unit="kg" onChange={(v) => setTc({ ...tc, weightKg: v })} />
                <div>
                  <Label>Gender</Label>
                  <Chips options={["Female", "Male", "Non-binary"]} selected={[tc.gender]} onToggle={(v) => setTc({ ...tc, gender: v })} />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <Label>Skin tone</Label>
                  <TypecastPicker
                    kind="skin"
                    palette={SKIN_TONES}
                    value={tc.skinTone}
                    onChange={(hex) => setTc({ ...tc, skinTone: hex })}
                  />
                </div>
                <div>
                  <Label>Eye color</Label>
                  <TypecastPicker
                    kind="eye"
                    palette={EYE_COLORS}
                    value={tc.eyeColor}
                    onChange={(hex) => setTc({ ...tc, eyeColor: hex })}
                  />
                </div>
                <div>
                  <Label>Hair color</Label>
                  <TypecastPicker
                    kind="hair"
                    palette={HAIR_COLORS}
                    value={tc.hairColor}
                    onChange={(hex) => setTc({ ...tc, hairColor: hex })}
                  />
                </div>
                <div>
                  <Label>Hair length</Label>
                  <Chips options={["Short", "Medium", "Long"]} selected={[tc.hairLength]} onToggle={(v) => setTc({ ...tc, hairLength: v })} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <Label>Languages</Label>
                  <Chips
                    options={LANGUAGES}
                    selected={tc.languages}
                    multi
                    onToggle={(v) => setTc({
                      ...tc,
                      languages: tc.languages.includes(v) ? tc.languages.filter((x) => x !== v) : [...tc.languages, v],
                    })}
                  />
                </div>
                <div>
                  <Label>Special skills</Label>
                  <Chips
                    options={SKILLS}
                    selected={tc.skills}
                    multi
                    onToggle={(v) => setTc({
                      ...tc,
                      skills: tc.skills.includes(v) ? tc.skills.filter((x) => x !== v) : [...tc.skills, v],
                    })}
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <Label>Age range you can play</Label>
                  <div className="flex items-center gap-4 mt-3">
                    <NumberBox label="From" value={tc.ageRangeMin} onChange={(v) => setTc({ ...tc, ageRangeMin: v })} />
                    <div className="text-text-subtle">→</div>
                    <NumberBox label="To" value={tc.ageRangeMax} onChange={(v) => setTc({ ...tc, ageRangeMax: v })} />
                  </div>
                </div>
                <div>
                  <Label>Genres you love</Label>
                  <Chips
                    options={GENRES}
                    selected={tc.genres}
                    multi
                    onToggle={(v) => setTc({
                      ...tc,
                      genres: tc.genres.includes(v) ? tc.genres.filter((x) => x !== v) : [...tc.genres, v],
                    })}
                  />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 max-w-[440px] mx-auto p-4 glass border-t border-border">
        <button
          onClick={next}
          className="w-full h-14 rounded-2xl bg-gold text-bg font-semibold hover:bg-gold-light flex items-center justify-center gap-2"
        >
          {step < STEPS.length - 1 ? "Continue" : "Enter CastIt"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-wider text-text-muted mb-3">{children}</div>;
}

function Slider({
  label, value, min, max, unit, onChange,
}: { label: string; value: number; min: number; max: number; unit: string; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <Label>{label}</Label>
        <span className="font-display text-2xl text-gold tnum">
          {value}<span className="text-text-muted text-sm ml-1 font-sans">{unit}</span>
        </span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function Chips({
  options, selected, onToggle, multi,
}: { options: string[]; selected: string[]; onToggle: (v: string) => void; multi?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={cn(
              "px-4 h-10 rounded-full border text-sm font-medium transition-all",
              active ? "bg-gold text-bg border-gold" : "bg-bg-elevated text-text border-border hover:border-border-strong"
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function NumberBox({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex-1">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <input
        type="number" value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-14 px-4 rounded-2xl bg-bg-elevated border border-border text-center font-display text-2xl text-gold tnum outline-none focus:border-gold/60"
      />
    </div>
  );
}
