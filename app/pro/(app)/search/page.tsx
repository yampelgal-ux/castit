"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter, X, Search, Users, Sparkles, ChevronDown, MessageCircle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { TALENTS, type BodyType, type VoiceType, type UnionStatus, type ExperienceLevel } from "@/lib/mock-data";
import { matchTalent } from "@/lib/matching";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { SKIN_TONES, EYE_COLORS, HAIR_COLORS, BODY_TYPES } from "@/lib/typecast-palette";
import { cn, formatNumber } from "@/lib/utils";

type Filters = {
  gender: string[];
  ageRange?: [number, number];
  heightRange?: [number, number];
  ethnicities: string[];
  bodyTypes: BodyType[];
  hairColors: string[];
  hairLengths: ("Short" | "Medium" | "Long")[];
  eyeColors: string[];
  skinTones: string[];
  languages: string[];
  accents: string[];
  voiceTypes: VoiceType[];
  skills: string[];
  unionStatus: UnionStatus[];
  experienceLevels: ExperienceLevel[];
  locations: string[];
  mustTravel: boolean;
};

const EMPTY: Filters = {
  gender: [], ethnicities: [], bodyTypes: [], hairColors: [], hairLengths: [],
  eyeColors: [], skinTones: [], languages: [], accents: [], voiceTypes: [],
  skills: [], unionStatus: [], experienceLevels: [], locations: [], mustTravel: false,
};

// Option pools
const GENDERS = ["Female", "Male", "Non-binary"];
const ETHNICITIES = ["Mediterranean", "European", "Middle Eastern", "Mixed", "Ashkenazi", "Mizrahi", "African", "Asian", "Latinx", "Mixed European"];
const BODY: BodyType[] = ["Slim", "Athletic", "Average", "Curvy", "Muscular", "Plus-size"];
const HAIR_LENGTHS: ("Short" | "Medium" | "Long")[] = ["Short", "Medium", "Long"];
const VOICE: VoiceType[] = ["Soprano", "Mezzo", "Alto", "Tenor", "Baritone", "Bass", "Spoken only"];
const UNION: UnionStatus[] = ["Union", "Non-union", "Eligible"];
const LEVELS: ExperienceLevel[] = ["Beginner", "Emerging", "Established", "Veteran"];
const LANGUAGES = ["Hebrew", "English", "French", "German", "Russian", "Spanish", "Arabic", "Italian"];
const ACCENTS = ["British RP", "American Standard", "American Southern", "Brooklyn", "Russian", "German", "Arabic", "Spanish", "Parisian French", "Mizrahi"];
const SKILLS = ["Stage Combat", "Krav Maga", "Boxing", "Horseback Riding", "Motorcycle", "Singing (Mezzo)", "Improv", "Tap Dance", "Method Acting", "Guitar", "Piano", "Yoga", "Surfing", "Skateboarding", "Runway", "Dialects"];
const LOCATIONS = ["Tel Aviv", "Jerusalem", "Haifa", "Eilat", "Berlin", "London", "NYC", "LA"];

// Palettes imported from lib/typecast-palette.ts (named, industry-standard)

export default function ProSearchPage() {
  const [f, setF] = useState<Filters>(EMPTY);
  const [openPanel, setOpenPanel] = useState(false);

  const ranked = useMemo(() => {
    const anySoft =
      !!f.ageRange || !!f.heightRange ||
      f.ethnicities.length || f.bodyTypes.length ||
      f.hairColors.length || f.hairLengths.length ||
      f.eyeColors.length || f.skinTones.length ||
      f.languages.length || f.accents.length || f.voiceTypes.length ||
      f.skills.length || f.experienceLevels.length || f.locations.length;
    const threshold = anySoft ? 30 : 0;
    return TALENTS.map((t) => ({
      talent: t,
      match: matchTalent(t, {
        gender: f.gender,
        ageRange: f.ageRange,
        heightRange: f.heightRange,
        ethnicities: f.ethnicities,
        bodyTypes: f.bodyTypes,
        hairColors: f.hairColors,
        hairLengths: f.hairLengths,
        eyeColors: f.eyeColors,
        skinTones: f.skinTones,
        languages: f.languages,
        accents: f.accents,
        voiceTypes: f.voiceTypes,
        skills: f.skills,
        unionStatus: f.unionStatus,
        experienceLevels: f.experienceLevels,
        locations: f.locations,
        mustTravel: f.mustTravel || undefined,
      }),
    }))
      .filter((r) => r.match.passes && r.match.score >= threshold)
      .sort((a, b) => b.match.score - a.match.score);
  }, [f]);

  const activeCount = useMemo(() => {
    let n = 0;
    n += f.gender.length;
    n += f.ageRange ? 1 : 0;
    n += f.heightRange ? 1 : 0;
    n += f.ethnicities.length;
    n += f.bodyTypes.length;
    n += f.hairColors.length;
    n += f.hairLengths.length;
    n += f.eyeColors.length;
    n += f.skinTones.length;
    n += f.languages.length;
    n += f.accents.length;
    n += f.voiceTypes.length;
    n += f.skills.length;
    n += f.unionStatus.length;
    n += f.experienceLevels.length;
    n += f.locations.length;
    n += f.mustTravel ? 1 : 0;
    return n;
  }, [f]);

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header
        back
        title="Talent search"
        right={
          activeCount > 0 && (
            <button onClick={() => setF(EMPTY)} className="text-[11px] text-text-muted underline">
              Clear all
            </button>
          )
        }
      />

      {/* Live result counter */}
      <div className="sticky top-0 z-20 px-4 pt-3 pb-3 bg-bg/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenPanel(true)}
            className="flex-1 h-12 px-4 rounded-2xl bg-bg-elevated border border-border flex items-center gap-2 text-sm text-text-muted"
          >
            <Filter className="w-4 h-4 text-gold" />
            <span className="flex-1 text-left">
              {activeCount === 0 ? "Add filters to narrow your search" : `${activeCount} filter${activeCount > 1 ? "s" : ""} active`}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <div className="h-12 px-4 rounded-2xl bg-gold/10 border border-gold/30 flex flex-col items-center justify-center min-w-[80px]">
            <span className="font-display text-base text-gold tnum leading-none">{ranked.length}</span>
            <span className="text-[9px] uppercase tracking-wider text-gold/80 leading-none mt-0.5">matches</span>
          </div>
        </div>

        {/* Active filter chips */}
        {activeCount > 0 && (
          <div className="flex gap-1.5 mt-2.5 overflow-x-auto no-scrollbar">
            {f.gender.map((g) => (
              <Chip key={"g-"+g} onClear={() => setF({ ...f, gender: f.gender.filter((x) => x !== g) })}>{g}</Chip>
            ))}
            {f.ageRange && <Chip onClear={() => setF({ ...f, ageRange: undefined })}>{f.ageRange[0]}–{f.ageRange[1]} yrs</Chip>}
            {f.heightRange && <Chip onClear={() => setF({ ...f, heightRange: undefined })}>{f.heightRange[0]}–{f.heightRange[1]} cm</Chip>}
            {f.skills.map((s) => <Chip key={"sk-"+s} onClear={() => setF({ ...f, skills: f.skills.filter((x) => x !== s) })}>{s}</Chip>)}
            {f.languages.map((l) => <Chip key={"l-"+l} onClear={() => setF({ ...f, languages: f.languages.filter((x) => x !== l) })}>{l}</Chip>)}
            {f.bodyTypes.map((b) => <Chip key={"b-"+b} onClear={() => setF({ ...f, bodyTypes: f.bodyTypes.filter((x) => x !== b) })}>{b}</Chip>)}
            {f.unionStatus.map((u) => <Chip key={"u-"+u} onClear={() => setF({ ...f, unionStatus: f.unionStatus.filter((x) => x !== u) })}>{u}</Chip>)}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="px-4 pt-4 space-y-2.5">
        {ranked.length === 0 ? (
          <div className="text-center py-16 px-6">
            <Users className="w-10 h-10 text-text-subtle mx-auto opacity-50" />
            <p className="font-display text-xl mt-4">No matches — yet</p>
            <p className="text-sm text-text-muted mt-1.5 max-w-xs mx-auto">
              Your filters are very specific. Relax one to widen the pool.
            </p>
          </div>
        ) : (
          ranked.map(({ talent, match }, i) => (
            <motion.div
              key={talent.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-2xl bg-bg-elevated border border-border overflow-hidden"
            >
              <Link href={`/profile/${talent.username}`} className="flex gap-3 p-3">
                <img src={talent.photo} alt={talent.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-sm truncate">{talent.name}</span>
                      {talent.verified && <VerifiedBadge />}
                    </div>
                    <MatchBadge score={match.score} />
                  </div>
                  <p className="text-[11px] text-text-muted truncate mt-0.5">
                    {talent.typecast.gender} · {talent.typecast.ageRange[0]}–{talent.typecast.ageRange[1]} · {talent.typecast.heightCm}cm · {talent.typecast.location}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {talent.typecast.skills.slice(0, 3).map((s) => (
                      <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full bg-bg border border-border text-text-muted">{s}</span>
                    ))}
                  </div>
                </div>
              </Link>
              <div className="flex items-center justify-between px-3 py-2.5 border-t border-border bg-bg/40 text-[11px]">
                <span className="text-text-muted">
                  <span className="text-text font-semibold tnum">{formatNumber(talent.followers)}</span> followers
                </span>
                <Link
                  href={`/messages?with=${talent.id}&name=${encodeURIComponent(talent.name)}`}
                  className="h-7 px-3 rounded-full bg-gold text-bg text-[11px] font-semibold inline-flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" /> Reach out
                </Link>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {openPanel && (
          <FilterPanel
            filters={f}
            onChange={setF}
            onClose={() => setOpenPanel(false)}
            results={ranked.length}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MatchBadge({ score }: { score: number }) {
  const tone =
    score >= 85 ? "bg-success/15 text-success border-success/30"
    : score >= 65 ? "bg-gold/15 text-gold border-gold/30"
    : "bg-bg text-text-muted border-border";
  return (
    <span className={cn("text-[10px] tnum font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", tone)}>
      {score}% match
    </span>
  );
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className="shrink-0 inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-[11px]">
      {children}
      <button onClick={onClear} className="w-5 h-5 grid place-items-center rounded-full hover:bg-gold/20">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function FilterPanel({
  filters: f, onChange, onClose, results,
}: { filters: Filters; onChange: (f: Filters) => void; onClose: () => void; results: number }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-40" onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed bottom-0 inset-x-0 max-w-[440px] mx-auto z-50 bg-bg-elevated border-t border-border rounded-t-3xl max-h-[90dvh] flex flex-col"
      >
        <div className="p-5 pb-3 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl">Refine search</h3>
            <p className="text-[11px] text-text-muted">{results} talent{results !== 1 ? "s" : ""} match these filters</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-bg-muted grid place-items-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Identity */}
          <Section title="Identity">
            <MultiTags label="Gender" options={GENDERS} value={f.gender} onChange={(v) => onChange({ ...f, gender: v })} />
            <RangeRow
              label="Age" min={16} max={75}
              value={f.ageRange ?? [16, 75]}
              suffix="yrs"
              onChange={(v) => onChange({ ...f, ageRange: v })}
              onClear={() => onChange({ ...f, ageRange: undefined })}
              active={!!f.ageRange}
            />
            <RangeRow
              label="Height" min={140} max={210}
              value={f.heightRange ?? [140, 210]}
              suffix="cm"
              onChange={(v) => onChange({ ...f, heightRange: v })}
              onClear={() => onChange({ ...f, heightRange: undefined })}
              active={!!f.heightRange}
            />
            <MultiTags label="Ethnicity" options={ETHNICITIES} value={f.ethnicities} onChange={(v) => onChange({ ...f, ethnicities: v })} />
            <MultiTags label="Body type" options={BODY} value={f.bodyTypes} onChange={(v) => onChange({ ...f, bodyTypes: v as BodyType[] })} />
          </Section>

          {/* Appearance */}
          <Section title="Appearance">
            <ColorSwatchPicker label="Hair color" palette={HAIR_COLORS} value={f.hairColors} onChange={(v) => onChange({ ...f, hairColors: v })} />
            <MultiTags label="Hair length" options={HAIR_LENGTHS} value={f.hairLengths} onChange={(v) => onChange({ ...f, hairLengths: v as any })} />
            <ColorSwatchPicker label="Eye color" palette={EYE_COLORS} value={f.eyeColors} onChange={(v) => onChange({ ...f, eyeColors: v })} />
            <ColorSwatchPicker label="Skin tone (Fitzpatrick I–VII)" palette={SKIN_TONES} value={f.skinTones} onChange={(v) => onChange({ ...f, skinTones: v })} />
          </Section>

          {/* Performance */}
          <Section title="Performance">
            <MultiTags label="Languages" options={LANGUAGES} value={f.languages} onChange={(v) => onChange({ ...f, languages: v })} />
            <MultiTags label="Accents" options={ACCENTS} value={f.accents} onChange={(v) => onChange({ ...f, accents: v })} />
            <MultiTags label="Voice type" options={VOICE} value={f.voiceTypes} onChange={(v) => onChange({ ...f, voiceTypes: v as VoiceType[] })} />
            <MultiTags label="Skills" options={SKILLS} value={f.skills} onChange={(v) => onChange({ ...f, skills: v })} />
          </Section>

          {/* Career */}
          <Section title="Career">
            <MultiTags label="Union status" options={UNION} value={f.unionStatus} onChange={(v) => onChange({ ...f, unionStatus: v as UnionStatus[] })} />
            <MultiTags label="Experience" options={LEVELS} value={f.experienceLevels} onChange={(v) => onChange({ ...f, experienceLevels: v as ExperienceLevel[] })} />
            <MultiTags label="Location" options={LOCATIONS} value={f.locations} onChange={(v) => onChange({ ...f, locations: v })} />
            <label className="flex items-center justify-between px-1 py-1">
              <span className="text-sm">Must be willing to travel</span>
              <button
                onClick={() => onChange({ ...f, mustTravel: !f.mustTravel })}
                className={cn(
                  "w-11 h-6 rounded-full relative transition-colors",
                  f.mustTravel ? "bg-gold" : "bg-bg-muted"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-bg transition-all",
                  f.mustTravel ? "left-5" : "left-0.5"
                )} />
              </button>
            </label>
          </Section>
        </div>

        <div className="p-5 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-gold text-bg font-semibold inline-flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Show {results} match{results !== 1 ? "es" : ""}
          </button>
        </div>
      </motion.div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[10px] uppercase tracking-widest text-gold font-semibold mb-3">{title}</div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function MultiTags({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <div className="text-[11px] text-text-muted mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = value.includes(o);
          return (
            <button
              key={o}
              onClick={() => onChange(active ? value.filter((v) => v !== o) : [...value, o])}
              className={cn(
                "h-8 px-3 rounded-full text-xs border transition-colors",
                active ? "border-gold bg-gold/15 text-gold" : "border-border bg-bg text-text-muted hover:border-border-strong"
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RangeRow({
  label, min, max, value, suffix, onChange, onClear, active,
}: {
  label: string; min: number; max: number; value: [number, number]; suffix: string;
  onChange: (v: [number, number]) => void; onClear: () => void; active: boolean;
}) {
  const [lo, hi] = value;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px] text-text-muted">{label}</div>
        <div className="text-[11px] tnum">
          {active ? <span className="text-gold font-semibold">{lo}–{hi} {suffix}</span> : <span className="text-text-subtle">Any</span>}
          {active && (
            <button onClick={onClear} className="ml-2 text-text-muted underline text-[10px]">clear</button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="range" min={min} max={max} value={lo}
          onChange={(e) => onChange([Math.min(+e.target.value, hi), hi])}
          className="w-full"
        />
        <input
          type="range" min={min} max={max} value={hi}
          onChange={(e) => onChange([lo, Math.max(+e.target.value, lo)])}
          className="w-full"
        />
      </div>
    </div>
  );
}
