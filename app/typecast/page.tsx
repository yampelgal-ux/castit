"use client";
import { photoToDataUrl } from "@/lib/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ShieldCheck, Camera } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLangStore } from "@/lib/i18n";
import { SKIN_TONES, EYE_COLORS, HAIR_COLORS } from "@/lib/typecast-palette";
import { TypecastPicker } from "@/components/TypecastPicker";
import { PhotoPicker } from "@/components/PhotoPicker";
import { cn } from "@/lib/utils";
import {
  GENDERS, BODY, CLOTHING_SIZES, HAIR_LENGTHS, HAIR_TYPES, FACIAL_HAIR, ETHNICITIES, FEATURES,
  LANGUAGES, ACCENTS, VOICE, SKILL_GROUPS, GENRES, LEVELS, LOCATIONS, UNION, WORK_PERMITS, optLabel,
} from "@/lib/typecast-options";

const STEPS = ["Physical", "Appearance", "Skills", "Range", "Career"] as const;
const STEPS_HE = ["גוף", "מראה", "כישורים", "טווח", "קריירה"];

export default function TypecastPage() {
  const router = useRouter();
  const { setTypecast, setProfile, signIn, profile } = useStore();
  const lang = useLangStore((s) => s.lang);
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const o = (v: string) => optLabel(v, he);
  const [step, setStep] = useState(0);
  const saved = profile.typecast || {};
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
    ethnicity: "",
    bodyType: "",
    hairType: "",
    facialHair: "None",
    features: [] as string[],
    accents: [] as string[],
    voiceType: "",
    unionStatus: "",
    experienceLevel: "",
    location: "",
    willingToTravel: true,
    clothingSize: "",
    shoeSizeEU: 40,
    driverLicense: false,
    hasAgent: false,
    workPermits: ["Israel"] as string[],
    ...saved,
  });
  const set = (p: Partial<typeof tc>) => setTc((cur) => ({ ...cur, ...p }));
  const toggleIn = (key: "languages" | "skills" | "genres" | "features" | "accents" | "workPermits", v: string) =>
    setTc((cur) => ({ ...cur, [key]: cur[key].includes(v) ? cur[key].filter((x) => x !== v) : [...cur[key], v] }));
  const pickOne = (key: keyof typeof tc, v: string) => setTc((cur) => ({ ...cur, [key]: cur[key] === v ? "" : v }));

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

  async function onPhoto(file: File) {
    try { setProfile({ photoUrl: await photoToDataUrl(file) }); } catch {}
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
          <button onClick={back} aria-label={lang === "he" ? "חזרה" : "Back"} className="-ml-2 p-2 rounded-full hover:bg-bg-elevated">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs text-text-muted tnum">{L(`שלב ${step + 1} מתוך ${STEPS.length}`, `Step ${step + 1} of ${STEPS.length}`)}</span>
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
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gold/8 border border-gold/20 text-[0.6875rem] text-gold">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>{L("הטייפקאסט הוא תעודת הזהות שלך מול המלהקים. ככל שתמלאי יותר, תופיעי ביותר חיפושים.", "Your typecast is your casting ID. The more you fill in, the more searches you show up in.")}</span>
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
              <PhotoPicker
                onPick={onPhoto}
                cameraFacing="user"
                title="הוסף תמונת פרופיל"
                className="relative shrink-0 cursor-pointer"
              >
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
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gold text-on-accent grid place-items-center shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
                  <Camera className="w-3 h-3" />
                </span>
              </PhotoPicker>
              <div className="flex-1 min-w-0">
                <div className="text-[0.6875rem] uppercase tracking-widest text-gold mb-1">
                  Your profile photo
                </div>
                <div className="text-sm font-medium leading-snug">
                  {profile.photoUrl ? "This is what casting pros will see." : "Tap to upload — needed for verification."}
                </div>
                <div className="text-[0.6875rem] text-text-muted mt-1">
                  Use a clear, recent headshot.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-[0.6875rem] uppercase tracking-widest text-gold mb-2">{he ? STEPS_HE[step] : STEPS[step]}</div>
        <h2 className="font-display text-3xl leading-tight mb-1">
          {step === 0 && L("הנתונים הפיזיים.", "The physical basics.")}
          {step === 1 && L("המראה שלך.", "Your look.")}
          {step === 2 && L("המקצוע שלך.", "Your craft.")}
          {step === 3 && L("הטווח שלך.", "Your range.")}
          {step === 4 && L("הקריירה שלך.", "Your career.")}
        </h2>
        <p className="text-text-muted text-sm mb-7">
          {step === 0 && L("מלהקים מסננים לפי הנתונים האלה בדיוק.", "Casting pros filter by these exact stats.")}
          {step === 1 && L("בחרי את מה שהכי קרוב אלייך.", "Pick what's closest to you.")}
          {step === 2 && L("כנות משתלמת. זה מה שמביא אודישנים.", "Be honest. It's what makes you castable.")}
          {step === 3 && L("מה את יכולה לגלם ומה את אוהבת לעשות.", "What you can play and love to do.")}
          {step === 4 && L("איפה את, עם מי את עובדת ומה מותר לך.", "Where you are, who reps you, where you can work.")}
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
                <Slider label={L("גובה", "Height")} value={tc.heightCm} min={100} max={210} unit={L("ס״מ", "cm")} onChange={(v) => set({ heightCm: v })} />
                <Slider label={L("משקל", "Weight")} value={tc.weightKg} min={20} max={150} unit={L("ק״ג", "kg")} onChange={(v) => set({ weightKg: v })} />
                <div>
                  <Label>{L("מגדר", "Gender")}</Label>
                  <Chips options={[...GENDERS]} label={o} selected={[tc.gender]} onToggle={(v) => set({ gender: v })} />
                </div>
                <div>
                  <Label>{L("מבנה גוף", "Body type")}</Label>
                  <Chips options={BODY} label={o} selected={[tc.bodyType]} onToggle={(v) => pickOne("bodyType", v)} />
                </div>
                <div>
                  <Label>{L("מידת בגדים", "Clothing size")}</Label>
                  <Chips options={[...CLOTHING_SIZES]} selected={[tc.clothingSize]} onToggle={(v) => pickOne("clothingSize", v)} />
                </div>
                <Slider label={L("מידת נעליים (EU)", "Shoe size (EU)")} value={tc.shoeSizeEU} min={20} max={50} unit="" onChange={(v) => set({ shoeSizeEU: v })} />
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <Label>{L("גוון עור", "Skin tone")}</Label>
                  <TypecastPicker
                    kind="skin"
                    palette={SKIN_TONES}
                    value={tc.skinTone}
                    onChange={(hex) => set({ skinTone: hex })}
                  />
                </div>
                <div>
                  <Label>{L("צבע עיניים", "Eye color")}</Label>
                  <TypecastPicker
                    kind="eye"
                    palette={EYE_COLORS}
                    value={tc.eyeColor}
                    onChange={(hex) => set({ eyeColor: hex })}
                  />
                </div>
                <div>
                  <Label>{L("צבע שיער", "Hair color")}</Label>
                  <TypecastPicker
                    kind="hair"
                    palette={HAIR_COLORS}
                    value={tc.hairColor}
                    onChange={(hex) => set({ hairColor: hex })}
                  />
                </div>
                <div>
                  <Label>{L("אורך שיער", "Hair length")}</Label>
                  <Chips options={[...HAIR_LENGTHS]} label={o} selected={[tc.hairLength]} onToggle={(v) => set({ hairLength: v })} />
                </div>
                <div>
                  <Label>{L("סוג שיער", "Hair type")}</Label>
                  <Chips options={[...HAIR_TYPES]} label={o} selected={[tc.hairType]} onToggle={(v) => pickOne("hairType", v)} />
                </div>
                <div>
                  <Label>{L("שיער פנים", "Facial hair")}</Label>
                  <Chips options={[...FACIAL_HAIR]} label={o} selected={[tc.facialHair]} onToggle={(v) => set({ facialHair: v })} />
                </div>
                <div>
                  <Label>{L("מוצא / מראה", "Ethnicity / look")}</Label>
                  <Chips options={ETHNICITIES} label={o} selected={[tc.ethnicity]} onToggle={(v) => pickOne("ethnicity", v)} />
                </div>
                <div>
                  <Label>{L("סימנים מיוחדים", "Distinctive features")}</Label>
                  <Chips options={FEATURES} label={o} selected={tc.features} multi onToggle={(v) => toggleIn("features", v)} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <Label>{L("שפות", "Languages")}</Label>
                  <Chips options={LANGUAGES} label={o} selected={tc.languages} multi onToggle={(v) => toggleIn("languages", v)} />
                </div>
                <div>
                  <Label>{L("מבטאים", "Accents")}</Label>
                  <Chips options={ACCENTS} label={o} selected={tc.accents} multi onToggle={(v) => toggleIn("accents", v)} />
                </div>
                <div>
                  <Label>{L("סוג קול", "Voice type")}</Label>
                  <Chips options={VOICE} label={o} selected={[tc.voiceType]} onToggle={(v) => pickOne("voiceType", v)} />
                </div>
                {SKILL_GROUPS.map((g) => (
                  <div key={g.id}>
                    <Label>{he ? g.he : g.en}</Label>
                    <Chips options={g.options} label={o} selected={tc.skills} multi onToggle={(v) => toggleIn("skills", v)} />
                  </div>
                ))}
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <Label>{L("טווח גילאים שאת יכולה לגלם", "Age range you can play")}</Label>
                  <div className="flex items-center gap-4 mt-3">
                    <NumberBox label={L("מ-", "From")} value={tc.ageRangeMin} onChange={(v) => set({ ageRangeMin: v })} />
                    <div className="text-text-subtle">→</div>
                    <NumberBox label={L("עד", "To")} value={tc.ageRangeMax} onChange={(v) => set({ ageRangeMax: v })} />
                  </div>
                </div>
                <div>
                  <Label>{L("ז׳אנרים שאת אוהבת", "Genres you love")}</Label>
                  <Chips options={GENRES} label={o} selected={tc.genres} multi onToggle={(v) => toggleIn("genres", v)} />
                </div>
                <div>
                  <Label>{L("ניסיון", "Experience")}</Label>
                  <Chips options={LEVELS} label={o} selected={[tc.experienceLevel]} onToggle={(v) => pickOne("experienceLevel", v)} />
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div>
                  <Label>{L("איפה את גרה", "Where you're based")}</Label>
                  <Chips options={LOCATIONS} label={o} selected={[tc.location]} onToggle={(v) => pickOne("location", v)} />
                </div>
                <div>
                  <Label>{L("איגוד שחקנים", "Union")}</Label>
                  <Chips options={UNION} label={o} selected={[tc.unionStatus]} onToggle={(v) => pickOne("unionStatus", v)} />
                </div>
                <div>
                  <Label>{L("היתרי עבודה / דרכון", "Work permits / passport")}</Label>
                  <Chips options={WORK_PERMITS} label={o} selected={tc.workPermits} multi onToggle={(v) => toggleIn("workPermits", v)} />
                </div>
                <div className="space-y-2">
                  <Toggle label={L("מוכנה לנסוע לצילומים", "Willing to travel for shoots")} value={tc.willingToTravel} onChange={(v) => set({ willingToTravel: v })} />
                  <Toggle label={L("יש לי רישיון נהיגה", "I have a driver's licence")} value={tc.driverLicense} onChange={(v) => set({ driverLicense: v })} />
                  <Toggle label={L("יש לי סוכן/ת", "I have an agent")} value={tc.hasAgent} onChange={(v) => set({ hasAgent: v })} />
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
          className="w-full h-14 rounded-2xl bg-gold text-on-accent font-semibold hover:bg-gold-light flex items-center justify-center gap-2"
        >
          {step < STEPS.length - 1 ? L("המשך", "Continue") : L("שמירה וכניסה", "Save and enter")}
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
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function Chips({
  options, selected, onToggle, label = (v) => v,
}: { options: readonly string[]; selected: string[]; onToggle: (v: string) => void; multi?: boolean; label?: (v: string) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(o)}
            className={cn(
              "px-4 h-10 rounded-full border text-sm font-medium transition-all",
              active ? "bg-gold text-on-accent border-gold" : "bg-bg-elevated text-text border-border hover:border-border-strong"
            )}
          >
            {label(o)}
          </button>
        );
      })}
    </div>
  );
}

function NumberBox({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex-1">
      <div className="text-[0.6875rem] text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <input
        type="number" value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-14 px-4 rounded-2xl bg-bg-elevated border border-border text-center font-display text-2xl text-gold tnum outline-none focus:border-gold/60"
      />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between gap-3 px-4 h-14 rounded-2xl bg-bg-elevated border border-border text-sm font-medium">
      <span>{label}</span>
      <span className={cn("w-11 h-6 rounded-full relative transition-colors shrink-0", value ? "bg-gold" : "bg-bg-muted")}>
        <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-bg transition-all", value ? "start-5" : "start-0.5")} />
      </span>
    </button>
  );
}
