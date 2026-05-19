"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, ArrowLeft, Check, Megaphone, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { TALENTS, type Audition, type BodyType, type VoiceType, type UnionStatus, type ExperienceLevel } from "@/lib/mock-data";
import { matchTalent } from "@/lib/matching";
import { addAudition } from "@/lib/auditions-store";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const TYPES: Audition["type"][] = ["Feature Film", "TV Series", "Commercial", "Short Film", "Music Video", "Theatre", "Voice-over"];
const GENDERS = ["Female", "Male", "Non-binary"];
const BODY: BodyType[] = ["Slim", "Athletic", "Average", "Curvy", "Muscular", "Plus-size"];
const VOICE: VoiceType[] = ["Soprano", "Mezzo", "Alto", "Tenor", "Baritone", "Bass", "Spoken only"];
const UNION: UnionStatus[] = ["Union", "Non-union", "Eligible"];
const LEVELS: ExperienceLevel[] = ["Beginner", "Emerging", "Established", "Veteran"];
const LANGUAGES = ["Hebrew", "English", "French", "German", "Russian", "Spanish", "Arabic"];
const ACCENTS = ["British RP", "American Standard", "American Southern", "Russian", "German", "Arabic", "Spanish"];
const SKILLS = ["Stage Combat", "Krav Maga", "Horseback Riding", "Singing (Mezzo)", "Improv", "Method Acting", "Guitar", "Yoga", "Surfing", "Skateboarding", "Runway", "Dialects"];
const HAIR_LENGTHS: ("Short"|"Medium"|"Long")[] = ["Short", "Medium", "Long"];

export default function NewAuditionPage() {
  const router = useRouter();
  const { profile, userId } = useStore();
  const [step, setStep] = useState(0);

  // Brief
  const [title, setTitle] = useState("");
  const [type, setType] = useState<Audition["type"]>("Feature Film");
  const [studio, setStudio] = useState(profile.name || "Independent");
  const [location, setLocation] = useState("");
  const [paid, setPaid] = useState(true);
  const [fee, setFee] = useState("");
  const [deadline, setDeadline] = useState("");
  const [shootDates, setShootDates] = useState("");
  const [description, setDescription] = useState("");
  const [selfTape, setSelfTape] = useState("");

  // Target typecast
  const [gender, setGender] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState(20);
  const [ageMax, setAgeMax] = useState(40);
  const [useAge, setUseAge] = useState(false);
  const [heightMin, setHeightMin] = useState(160);
  const [heightMax, setHeightMax] = useState(190);
  const [useHeight, setUseHeight] = useState(false);
  const [bodyTypes, setBodyTypes] = useState<BodyType[]>([]);
  const [hairLengths, setHairLengths] = useState<("Short"|"Medium"|"Long")[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [accents, setAccents] = useState<string[]>([]);
  const [voiceTypes, setVoiceTypes] = useState<VoiceType[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [unionStatus, setUnionStatus] = useState<UnionStatus[]>([]);
  const [experienceLevels, setExperienceLevels] = useState<ExperienceLevel[]>([]);
  const [mustTravel, setMustTravel] = useState(false);

  const target = useMemo<Audition["targetTypecast"]>(() => ({
    gender: gender.length ? gender : undefined,
    ageRange: useAge ? [ageMin, ageMax] : undefined,
    heightRange: useHeight ? [heightMin, heightMax] : undefined,
    bodyTypes: bodyTypes.length ? bodyTypes : undefined,
    hairLengths: hairLengths.length ? hairLengths : undefined,
    languages: languages.length ? languages : undefined,
    accents: accents.length ? accents : undefined,
    voiceTypes: voiceTypes.length ? voiceTypes : undefined,
    skills: skills.length ? skills : undefined,
    unionStatus: unionStatus.length ? unionStatus : undefined,
    experienceLevels: experienceLevels.length ? experienceLevels : undefined,
    mustTravel: mustTravel || undefined,
  }), [gender, useAge, ageMin, ageMax, useHeight, heightMin, heightMax, bodyTypes, hairLengths, languages, accents, voiceTypes, skills, unionStatus, experienceLevels, mustTravel]);

  const preview = useMemo(() => {
    return TALENTS.map((t) => ({ talent: t, match: matchTalent(t, target) }))
      .filter((r) => r.match.passes)
      .sort((a, b) => b.match.score - a.match.score);
  }, [target]);

  const briefValid = title.length >= 3 && location.length >= 2 && description.length >= 10;

  function publish() {
    const audition: Audition = {
      id: crypto.randomUUID(),
      postedBy: userId ?? "pro-anon",
      studio: studio || "Independent",
      title, type, location, paid,
      fee: paid ? (fee || undefined) : undefined,
      deadline: deadline || "TBD",
      shootDates: shootDates || undefined,
      description,
      selfTapeInstructions: selfTape || undefined,
      targetTypecast: target,
      applicants: 0,
      createdAt: new Date().toISOString(),
    };
    addAudition(audition);
    haptic("success");
    router.push("/pro/dashboard");
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <Header back={step === 0} title="Post audition" />

      {/* Progress */}
      <div className="px-5 pt-3 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("flex-1 h-1 rounded-full transition-all", i <= step ? "bg-gold" : "bg-bg-elevated")} />
        ))}
      </div>

      <div className="flex-1 px-5 pt-6 pb-28 overflow-y-auto">
        {step === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-gold">Step 1 of 3</div>
              <h2 className="font-display text-2xl tracking-editorial">The brief</h2>
            </div>

            <Field label="Role title *" value={title} onChange={setTitle} placeholder="Lead Female — 'After the Rain'" />

            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5 px-1">Project type</div>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={cn(
                      "h-9 px-3 rounded-full text-xs border transition-colors",
                      type === t ? "border-gold bg-gold/15 text-gold" : "border-border bg-bg-elevated text-text-muted"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Studio / Production" value={studio} onChange={setStudio} placeholder="Northwind Pictures" />
            <Field label="Location *" value={location} onChange={setLocation} placeholder="Tel Aviv" />

            <div className="grid grid-cols-2 gap-2">
              <Field label="Deadline" value={deadline} onChange={setDeadline} placeholder="Jun 28" />
              <Field label="Shoot dates" value={shootDates} onChange={setShootDates} placeholder="Aug 12 – Sep 25" />
            </div>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-bg-elevated border border-border">
              <div>
                <div className="text-sm font-semibold">Paid role</div>
                <div className="text-[11px] text-text-muted">Unpaid auditions show fewer applicants.</div>
              </div>
              <button
                onClick={() => setPaid(!paid)}
                className={cn("w-11 h-6 rounded-full relative transition-colors", paid ? "bg-gold" : "bg-bg-muted")}
              >
                <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-bg transition-all", paid ? "left-5" : "left-0.5")} />
              </button>
            </label>

            {paid && (
              <Field label="Fee / Rate" value={fee} onChange={setFee} placeholder="$4–6K/day + travel" />
            )}

            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5 px-1">Description *</div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What's the role? What kind of person are you looking for?"
                className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border outline-none text-sm focus:border-gold/40 resize-none"
              />
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5 px-1">Self-tape instructions (optional)</div>
              <textarea
                value={selfTape}
                onChange={(e) => setSelfTape(e.target.value)}
                rows={3}
                placeholder="Slate + 90s monologue + 60s scene. One take, vertical, good lighting."
                className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border outline-none text-sm focus:border-gold/40 resize-none"
              />
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-gold">Step 2 of 3</div>
              <h2 className="font-display text-2xl tracking-editorial">Who are you looking for?</h2>
              <p className="text-text-muted text-sm mt-1">Leave anything blank to mean "any". More filters = fewer, better-matched applicants.</p>
            </div>

            <Group label="Gender">
              <Tags options={GENDERS} value={gender} onChange={setGender} />
            </Group>

            <Group label="Age range" toggle={useAge} onToggle={setUseAge}>
              {useAge && (
                <DualRange min={16} max={75} lo={ageMin} hi={ageMax} onChange={(l, h) => { setAgeMin(l); setAgeMax(h); }} suffix="yrs" />
              )}
            </Group>

            <Group label="Height range" toggle={useHeight} onToggle={setUseHeight}>
              {useHeight && (
                <DualRange min={140} max={210} lo={heightMin} hi={heightMax} onChange={(l, h) => { setHeightMin(l); setHeightMax(h); }} suffix="cm" />
              )}
            </Group>

            <Group label="Body type">
              <Tags options={BODY} value={bodyTypes} onChange={(v) => setBodyTypes(v as BodyType[])} />
            </Group>

            <Group label="Hair length">
              <Tags options={HAIR_LENGTHS} value={hairLengths} onChange={(v) => setHairLengths(v as any)} />
            </Group>

            <Group label="Languages">
              <Tags options={LANGUAGES} value={languages} onChange={setLanguages} />
            </Group>

            <Group label="Accents">
              <Tags options={ACCENTS} value={accents} onChange={setAccents} />
            </Group>

            <Group label="Voice type">
              <Tags options={VOICE} value={voiceTypes} onChange={(v) => setVoiceTypes(v as VoiceType[])} />
            </Group>

            <Group label="Skills">
              <Tags options={SKILLS} value={skills} onChange={setSkills} />
            </Group>

            <Group label="Union status">
              <Tags options={UNION} value={unionStatus} onChange={(v) => setUnionStatus(v as UnionStatus[])} />
            </Group>

            <Group label="Experience">
              <Tags options={LEVELS} value={experienceLevels} onChange={(v) => setExperienceLevels(v as ExperienceLevel[])} />
            </Group>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-bg-elevated border border-border">
              <span className="text-sm">Must be willing to travel</span>
              <button
                onClick={() => setMustTravel(!mustTravel)}
                className={cn("w-11 h-6 rounded-full relative transition-colors", mustTravel ? "bg-gold" : "bg-bg-muted")}
              >
                <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-bg transition-all", mustTravel ? "left-5" : "left-0.5")} />
              </button>
            </label>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-gold">Step 3 of 3</div>
              <h2 className="font-display text-2xl tracking-editorial">Preview & publish</h2>
            </div>

            <div className="rounded-2xl bg-bg-elevated border border-border p-4">
              <div className="text-[10px] uppercase tracking-widest text-gold">{type}</div>
              <h3 className="font-display text-xl mt-0.5">{title || "Untitled role"}</h3>
              <p className="text-[11px] text-text-muted mt-0.5">{studio} · {location} · {paid ? `Paid${fee ? ` (${fee})` : ""}` : "Unpaid"}</p>
              <p className="text-sm mt-3 leading-relaxed">{description || "—"}</p>
              {selfTape && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-[10px] uppercase tracking-widest text-text-muted">Self-tape</div>
                  <p className="text-xs mt-1 leading-relaxed">{selfTape}</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-gold/8 border border-gold/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-gold" />
                <span className="text-[11px] uppercase tracking-widest text-gold font-semibold">
                  Talent pool reach
                </span>
              </div>
              <div className="flex items-end gap-3">
                <span className="font-display text-4xl text-gold tnum">{preview.length}</span>
                <span className="text-xs text-text-muted pb-1">talents match your criteria</span>
              </div>
              <p className="text-[11px] text-text-muted mt-2 leading-relaxed">
                These talents will see your audition in their <strong>For You</strong> feed first.
                The post is also public — anyone can apply.
              </p>
              {preview.length > 0 && (
                <div className="flex -space-x-2 mt-3">
                  {preview.slice(0, 5).map(({ talent }) => (
                    <img key={talent.id} src={talent.photo} alt="" className="w-8 h-8 rounded-full border-2 border-gold/20 object-cover" />
                  ))}
                  {preview.length > 5 && (
                    <div className="w-8 h-8 rounded-full bg-gold/20 border-2 border-gold/20 grid place-items-center text-[10px] font-semibold text-gold">
                      +{preview.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Nav */}
      <div className="fixed bottom-0 inset-x-0 max-w-[440px] mx-auto p-4 bg-bg/95 backdrop-blur border-t border-border z-30">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => { setStep(step - 1); haptic("light"); }}
              className="w-12 h-12 rounded-full bg-bg-elevated border border-border grid place-items-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          {step < 2 ? (
            <button
              onClick={() => { setStep(step + 1); haptic("light"); }}
              disabled={step === 0 && !briefValid}
              className={cn(
                "flex-1 h-12 rounded-2xl font-semibold inline-flex items-center justify-center gap-2",
                step === 0 && !briefValid ? "bg-bg-elevated text-text-subtle" : "bg-gold text-bg"
              )}
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={publish}
              className="flex-1 h-12 rounded-2xl bg-gold text-bg font-semibold inline-flex items-center justify-center gap-2"
            >
              <Megaphone className="w-4 h-4" /> Publish audition
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5 px-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-4 rounded-xl bg-bg-elevated border border-border outline-none text-sm focus:border-gold/40"
      />
    </div>
  );
}

function Group({ label, children, toggle, onToggle }: { label: string; children: React.ReactNode; toggle?: boolean; onToggle?: (v: boolean) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="text-[11px] text-text-muted">{label}</div>
        {onToggle && (
          <button
            onClick={() => onToggle(!toggle)}
            className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
              toggle ? "text-gold bg-gold/10" : "text-text-subtle")}
          >
            {toggle ? "Specified" : "Any"}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Tags({ options, value, onChange }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value.includes(o);
        return (
          <button
            key={o}
            onClick={() => onChange(active ? value.filter((v) => v !== o) : [...value, o])}
            className={cn(
              "h-8 px-3 rounded-full text-xs border transition-colors",
              active ? "border-gold bg-gold/15 text-gold" : "border-border bg-bg-elevated text-text-muted"
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function DualRange({ min, max, lo, hi, suffix, onChange }: { min: number; max: number; lo: number; hi: number; suffix: string; onChange: (lo: number, hi: number) => void }) {
  return (
    <div>
      <div className="text-[11px] tnum text-gold font-semibold mb-2">{lo}–{hi} {suffix}</div>
      <div className="grid grid-cols-2 gap-2">
        <input type="range" min={min} max={max} value={lo} onChange={(e) => onChange(Math.min(+e.target.value, hi), hi)} className="w-full" />
        <input type="range" min={min} max={max} value={hi} onChange={(e) => onChange(lo, Math.max(+e.target.value, lo))} className="w-full" />
      </div>
    </div>
  );
}
