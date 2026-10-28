"use client";
import { useAllTalents } from "@/lib/cloud/talents";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter, X, Search, Users, Sparkles, ChevronDown, MessageCircle, Send, CheckSquare, Square,
} from "lucide-react";
import { SendAuditionSheet } from "@/components/SendAuditionSheet";
import { BulkInviteSheet } from "@/components/BulkInviteSheet";
import { AriaBriefBuilder, type ParsedFilters } from "@/components/AriaBriefBuilder";
import { Header } from "@/components/Header";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { TALENTS, type BodyType, type VoiceType, type UnionStatus, type ExperienceLevel } from "@/lib/mock-data";
import { matchTalent } from "@/lib/matching";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { SKIN_TONES, EYE_COLORS, HAIR_COLORS, BODY_TYPES } from "@/lib/typecast-palette";
import { cn, formatNumber } from "@/lib/utils";
import {
  GENDERS, ETHNICITIES, BODY, HAIR_LENGTHS, HAIR_TYPES, FACIAL_HAIR, FEATURES, CLOTHING_SIZES, VOICE, UNION, LEVELS,
  LANGUAGES, ACCENTS, SKILL_GROUPS, GENRES, LOCATIONS, WORK_PERMITS, optLabel,
} from "@/lib/typecast-options";
import { useT } from "@/lib/i18n";

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
  weightRange?: [number, number];
  hairTypes: string[];
  facialHair: string[];
  features: string[];
  genres: string[];
  clothingSizes: string[];
  shoeRange?: [number, number];
  needsLicense: boolean;
  needsAgent: boolean;
  workPermits: string[];
  hasVideo: boolean;
  verifiedOnly: boolean;
};

const EMPTY: Filters = {
  gender: [], ethnicities: [], bodyTypes: [], hairColors: [], hairLengths: [],
  eyeColors: [], skinTones: [], languages: [], accents: [], voiceTypes: [],
  skills: [], unionStatus: [], experienceLevels: [], locations: [], mustTravel: false,
  hairTypes: [], facialHair: [], features: [], genres: [], clothingSizes: [],
  needsLicense: false, needsAgent: false, workPermits: [], hasVideo: false, verifiedOnly: false,
};

type Sort = "match" | "newest" | "followers" | "name";

// Option pools are shared with the talent's typecast form (lib/typecast-options).
const SKILL_GROUPS_ = SKILL_GROUPS;
// Palettes imported from lib/typecast-palette.ts (named, industry-standard)

export default function ProSearchPage() {
  const { t, lang } = useT();
  const he = lang === "he";
  const [f, setF] = useState<Filters>(EMPTY);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("match");
  const [openPanel, setOpenPanel] = useState(false);
  const [inviteFor, setInviteFor] = useState<{ id: string; name: string; photo: string } | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  function applyAriaFilters(p: ParsedFilters) {
    // Merge into current filters — Aria's output is authoritative for the fields it set.
    setF((cur) => ({
      ...cur,
      gender: p.gender && p.gender.length ? p.gender : cur.gender,
      ageRange: p.ageRange ?? cur.ageRange,
      heightRange: p.heightRange ?? cur.heightRange,
      ethnicities: p.ethnicities && p.ethnicities.length ? p.ethnicities : cur.ethnicities,
      bodyTypes: p.bodyTypes && p.bodyTypes.length ? (p.bodyTypes as BodyType[]) : cur.bodyTypes,
      hairLengths: p.hairLengths && p.hairLengths.length ? (p.hairLengths as ("Short" | "Medium" | "Long")[]) : cur.hairLengths,
      languages: p.languages && p.languages.length ? p.languages : cur.languages,
      accents: p.accents && p.accents.length ? p.accents : cur.accents,
      voiceTypes: p.voiceTypes && p.voiceTypes.length ? (p.voiceTypes as VoiceType[]) : cur.voiceTypes,
      skills: p.skills && p.skills.length ? p.skills : cur.skills,
      unionStatus: p.unionStatus && p.unionStatus.length ? (p.unionStatus as UnionStatus[]) : cur.unionStatus,
      experienceLevels: p.experienceLevels && p.experienceLevels.length ? (p.experienceLevels as ExperienceLevel[]) : cur.experienceLevels,
      locations: p.locations && p.locations.length ? p.locations : cur.locations,
    }));
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allTalents = useAllTalents();
  const ranked = useMemo(() => {
    const anySoft =
      !!f.ageRange || !!f.heightRange ||
      f.ethnicities.length || f.bodyTypes.length ||
      f.hairColors.length || f.hairLengths.length ||
      f.eyeColors.length || f.skinTones.length ||
      f.languages.length || f.accents.length || f.voiceTypes.length ||
      f.skills.length || f.experienceLevels.length || f.locations.length ||
      !!f.weightRange || !!f.shoeRange || f.hairTypes.length || f.facialHair.length ||
      f.features.length || f.genres.length || f.clothingSizes.length;
    const threshold = anySoft ? 30 : 0;
    const needle = q.trim().toLowerCase();
    return allTalents
      .filter((t) => !needle || [t.name, t.username, t.bio, ...(t.typecast.skills || [])].some((x) => (x || "").toLowerCase().includes(needle)))
      .filter((t) => !f.hasVideo || (t.reels?.length ?? 0) > 0)
      .filter((t) => !f.verifiedOnly || t.verified)
      .map((t) => ({
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
        weightRange: f.weightRange,
        hairTypes: f.hairTypes,
        facialHair: f.facialHair,
        features: f.features,
        genres: f.genres,
        clothingSizes: f.clothingSizes,
        shoeRange: f.shoeRange,
        needsLicense: f.needsLicense || undefined,
        needsAgent: f.needsAgent || undefined,
        workPermits: f.workPermits,
      }),
    }))
      .filter((r) => r.match.passes && r.match.score >= threshold)
      .sort((a, b) =>
        sort === "followers" ? b.talent.followers - a.talent.followers
        : sort === "name" ? a.talent.name.localeCompare(b.talent.name)
        : sort === "newest" ? 0
        : b.match.score - a.match.score);
  }, [f, allTalents, q, sort]);

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
    n += f.weightRange ? 1 : 0;
    n += f.shoeRange ? 1 : 0;
    n += f.hairTypes.length + f.facialHair.length + f.features.length + f.genres.length + f.clothingSizes.length + f.workPermits.length;
    n += (f.needsLicense ? 1 : 0) + (f.needsAgent ? 1 : 0) + (f.hasVideo ? 1 : 0) + (f.verifiedOnly ? 1 : 0);
    return n;
  }, [f]);

  const selectedTalents = useMemo(
    () => ranked.filter((r) => selected.has(r.talent.id)).map((r) => r.talent),
    [ranked, selected]
  );

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header
        back
        title={t("srch.title")}
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectMode((m) => !m);
                if (selectMode) setSelected(new Set());
              }}
              className={cn(
                "text-[0.6875rem] font-semibold",
                selectMode ? "text-gold" : "text-text-muted"
              )}
            >
              {selectMode ? "Cancel" : "Select"}
            </button>
            {activeCount > 0 && (
              <button onClick={() => setF(EMPTY)} className="text-[0.6875rem] text-text-muted underline">
                {t("srch.clearAll")}
              </button>
            )}
          </div>
        }
      />

      {/* Aria brief builder — natural language to filters */}
      <div className="px-4 pt-3">
        <AriaBriefBuilder
          onApply={applyAriaFilters}
          onOpenManual={() => setOpenPanel(true)}
        />
      </div>

      {/* Live result counter */}
      <div className="sticky top-0 z-20 px-4 pt-3 pb-3 bg-bg/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <label className="flex-1 h-11 px-3 rounded-2xl bg-bg-elevated border border-border flex items-center gap-2">
            <Search className="w-4 h-4 text-text-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} dir="auto"
              placeholder={he ? "חיפוש לפי שם או כישור" : "Search by name or skill"}
              aria-label={he ? "חיפוש" : "Search"} className="flex-1 bg-transparent outline-none text-sm" />
          </label>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={he ? "מיון" : "Sort"}
            className="h-11 px-2 rounded-2xl bg-bg-elevated border border-border text-xs">
            <option value="match">{he ? "התאמה הכי גבוהה" : "Best match"}</option>
            <option value="newest">{he ? "הכי חדשים" : "Newest"}</option>
            <option value="followers">{he ? "הכי פופולריים" : "Most followed"}</option>
            <option value="name">{he ? "לפי שם" : "Name A–Z"}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenPanel(true)}
            className="flex-1 h-12 px-4 rounded-2xl bg-bg-elevated border border-border flex items-center gap-2 text-sm text-text-muted"
          >
            <Filter className="w-4 h-4 text-gold" />
            <span className="flex-1 text-left">
              {activeCount === 0
                ? (he ? "הוספת פילטרים לסינון מדויק" : "Add filters to narrow your search")
                : he ? `${activeCount} פילטרים פעילים` : `${activeCount} filter${activeCount > 1 ? "s" : ""} active`}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <div className="h-12 px-4 rounded-2xl bg-gold/10 border border-gold/30 flex flex-col items-center justify-center min-w-[80px]">
            <span className="font-display text-base text-gold tnum leading-none">{ranked.length}</span>
            <span className="text-[0.6875rem] uppercase tracking-wider text-gold/80 leading-none mt-0.5">{t("srch.matches")}</span>
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
            {f.weightRange && <Chip onClear={() => setF({ ...f, weightRange: undefined })}>{f.weightRange[0]}–{f.weightRange[1]} kg</Chip>}
            {f.shoeRange && <Chip onClear={() => setF({ ...f, shoeRange: undefined })}>{he ? "נעליים" : "Shoe"} {f.shoeRange[0]}–{f.shoeRange[1]}</Chip>}
            {(["ethnicities", "hairLengths", "hairTypes", "facialHair", "features", "genres", "clothingSizes", "accents", "voiceTypes", "experienceLevels", "locations", "workPermits"] as const).flatMap((k) =>
              (f[k] as string[]).map((v) => (
                <Chip key={k + v} onClear={() => setF({ ...f, [k]: (f[k] as string[]).filter((x) => x !== v) })}>{optLabel(v, he)}</Chip>
              )))}
            {f.needsLicense && <Chip onClear={() => setF({ ...f, needsLicense: false })}>{he ? "רישיון נהיגה" : "Driver's licence"}</Chip>}
            {f.needsAgent && <Chip onClear={() => setF({ ...f, needsAgent: false })}>{he ? "עם סוכן" : "Has agent"}</Chip>}
            {f.hasVideo && <Chip onClear={() => setF({ ...f, hasVideo: false })}>{he ? "עם סרטון" : "Has video"}</Chip>}
            {f.verifiedOnly && <Chip onClear={() => setF({ ...f, verifiedOnly: false })}>{he ? "מאומתים" : "Verified"}</Chip>}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="px-4 pt-4 space-y-2.5">
        {ranked.length === 0 ? (
          <div className="text-center py-16 px-6">
            <Users className="w-10 h-10 text-text-subtle mx-auto opacity-50" />
            <p className="font-display text-xl mt-4">{t("srch.noMatches")}</p>
            <p className="text-sm text-text-muted mt-1.5 max-w-xs mx-auto">
              Your filters are very specific. Relax one to widen the pool.
            </p>
          </div>
        ) : (
          ranked.map(({ talent, match }, i) => {
            const isSelected = selected.has(talent.id);
            const RowWrap = selectMode ? "button" : Link;
            const rowProps: any = selectMode
              ? { onClick: () => toggleSelect(talent.id), type: "button" }
              : { href: `/profile/${talent.username}` };
            return (
              <motion.div
                key={talent.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "rounded-2xl bg-bg-elevated border overflow-hidden transition-colors",
                  isSelected ? "border-gold/60" : "border-border"
                )}
              >
                <RowWrap {...rowProps} className="flex gap-3 p-3 w-full text-left">
                  {selectMode && (
                    <div className="self-center shrink-0">
                      {isSelected ? <CheckSquare className="w-5 h-5 text-gold" /> : <Square className="w-5 h-5 text-text-subtle" />}
                    </div>
                  )}
                  <img src={talent.photo} alt={talent.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-sm truncate">{talent.name}</span>
                        {talent.verified && <VerifiedBadge />}
                      </div>
                      <MatchBadge score={match.score} />
                    </div>
                    <p className="text-[0.6875rem] text-text-muted truncate mt-0.5">
                      {talent.typecast.gender} · {talent.typecast.ageRange[0]}–{talent.typecast.ageRange[1]} · {talent.typecast.heightCm}cm{talent.typecast.location ? ` · ${talent.typecast.location}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {talent.typecast.skills.slice(0, 3).map((s) => (
                        <span key={s} className="text-[0.6875rem] px-1.5 py-0.5 rounded-full bg-bg border border-border text-text-muted">{s}</span>
                      ))}
                    </div>
                  </div>
                </RowWrap>
                {!selectMode && (
                  <div className="flex items-center justify-between px-3 py-2.5 border-t border-border bg-bg/40 text-[0.6875rem] gap-2">
                    <span className="text-text-muted truncate">
                      <span className="text-text font-semibold tnum">{formatNumber(talent.followers)}</span> followers
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href={`/messages?with=${talent.id}&name=${encodeURIComponent(talent.name)}`}
                        className="h-7 w-7 rounded-full bg-bg border border-border text-text grid place-items-center"
                        aria-label="Message"
                      >
                        <MessageCircle className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={(e) => { e.preventDefault(); setInviteFor({ id: talent.id, name: talent.name, photo: talent.photo }); }}
                        className="h-7 px-3 rounded-full bg-gold text-on-accent text-[0.6875rem] font-semibold inline-flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Invite
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
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

      <SendAuditionSheet
        open={!!inviteFor}
        onClose={() => setInviteFor(null)}
        talent={inviteFor ?? { id: "", name: "", photo: "" }}
      />

      {/* Floating bulk-action bar */}
      <AnimatePresence>
        {selectMode && selected.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-4 inset-x-0 max-w-[440px] mx-auto px-4 z-40"
          >
            <div className="rounded-2xl bg-bg-elevated border border-gold/40 shadow-[0_12px_36px_rgba(0,0,0,0.5)] p-3 flex items-center gap-3">
              <span className="text-xs">
                <span className="font-bold text-gold tnum">{selected.size}</span>{" "}
                <span className="text-text-muted">selected</span>
              </span>
              <button
                onClick={() => setSelected(new Set())}
                className="text-[0.6875rem] text-text-muted underline"
              >
                Clear
              </button>
              <button
                onClick={() => setBulkOpen(true)}
                className="ml-auto h-9 px-4 rounded-full bg-gold text-on-accent text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Invite all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BulkInviteSheet
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        talents={selectedTalents.map((t) => ({ id: t.id, name: t.name, photo: t.photo }))}
        onSent={() => {
          setBulkOpen(false);
          setSelected(new Set());
          setSelectMode(false);
        }}
      />
    </div>
  );
}

function MatchBadge({ score }: { score: number }) {
  const tone =
    score >= 85 ? "bg-success/15 text-success border-success/30"
    : score >= 65 ? "bg-gold/15 text-gold border-gold/30"
    : "bg-bg text-text-muted border-border";
  return (
    <span className={cn("text-[0.6875rem] tnum font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", tone)}>
      {score}% match
    </span>
  );
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className="shrink-0 inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-[0.6875rem]">
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
  const { t, lang } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const o = (v: string) => optLabel(v, he);
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
            <h3 className="font-display text-xl">{t("srch.refine")}</h3>
            <p className="text-[0.6875rem] text-text-muted">{t("srch.matchCount", { n: results })}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-bg-muted grid place-items-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <Section title={L("זהות", "Identity")}>
            <MultiTags label={L("מגדר", "Gender")} o={o} options={GENDERS} value={f.gender} onChange={(v) => onChange({ ...f, gender: v })} />
            <RangeRow label={L("גיל", "Age")} min={3} max={90} value={f.ageRange ?? [3, 90]} suffix={L("שנים", "yrs")} he={he}
              onChange={(v) => onChange({ ...f, ageRange: v })} onClear={() => onChange({ ...f, ageRange: undefined })} active={!!f.ageRange} />
            <MultiTags label={L("מוצא / מראה", "Ethnicity / look")} o={o} options={ETHNICITIES} value={f.ethnicities} onChange={(v) => onChange({ ...f, ethnicities: v })} />
          </Section>

          <Section title={L("גוף ומידות", "Body & sizes")}>
            <RangeRow label={L("גובה", "Height")} min={100} max={210} value={f.heightRange ?? [100, 210]} suffix={L("ס״מ", "cm")} he={he}
              onChange={(v) => onChange({ ...f, heightRange: v })} onClear={() => onChange({ ...f, heightRange: undefined })} active={!!f.heightRange} />
            <RangeRow label={L("משקל", "Weight")} min={20} max={150} value={f.weightRange ?? [20, 150]} suffix={L("ק״ג", "kg")} he={he}
              onChange={(v) => onChange({ ...f, weightRange: v })} onClear={() => onChange({ ...f, weightRange: undefined })} active={!!f.weightRange} />
            <MultiTags label={L("מבנה גוף", "Body type")} o={o} options={BODY} value={f.bodyTypes} onChange={(v) => onChange({ ...f, bodyTypes: v as BodyType[] })} />
            <MultiTags label={L("מידת בגדים", "Clothing size")} o={o} options={CLOTHING_SIZES} value={f.clothingSizes} onChange={(v) => onChange({ ...f, clothingSizes: v })} />
            <RangeRow label={L("מידת נעליים (EU)", "Shoe size (EU)")} min={20} max={50} value={f.shoeRange ?? [20, 50]} suffix="" he={he}
              onChange={(v) => onChange({ ...f, shoeRange: v })} onClear={() => onChange({ ...f, shoeRange: undefined })} active={!!f.shoeRange} />
          </Section>

          <Section title={L("מראה", "Appearance")}>
            <ColorSwatchPicker label={L("צבע שיער", "Hair color")} palette={HAIR_COLORS} value={f.hairColors} onChange={(v) => onChange({ ...f, hairColors: v })} />
            <MultiTags label={L("אורך שיער", "Hair length")} o={o} options={HAIR_LENGTHS} value={f.hairLengths} onChange={(v) => onChange({ ...f, hairLengths: v as any })} />
            <MultiTags label={L("סוג שיער", "Hair type")} o={o} options={HAIR_TYPES} value={f.hairTypes} onChange={(v) => onChange({ ...f, hairTypes: v })} />
            <MultiTags label={L("שיער פנים", "Facial hair")} o={o} options={FACIAL_HAIR} value={f.facialHair} onChange={(v) => onChange({ ...f, facialHair: v })} />
            <ColorSwatchPicker label={L("צבע עיניים", "Eye color")} palette={EYE_COLORS} value={f.eyeColors} onChange={(v) => onChange({ ...f, eyeColors: v })} />
            <ColorSwatchPicker label={L("גוון עור", "Skin tone (Fitzpatrick I–VII)")} palette={SKIN_TONES} value={f.skinTones} onChange={(v) => onChange({ ...f, skinTones: v })} />
            <MultiTags label={L("סימנים מיוחדים", "Distinctive features")} o={o} options={FEATURES} value={f.features} onChange={(v) => onChange({ ...f, features: v })} />
          </Section>

          <Section title={L("שפה וקול", "Language & voice")}>
            <MultiTags label={L("שפות", "Languages")} o={o} options={LANGUAGES} value={f.languages} onChange={(v) => onChange({ ...f, languages: v })} />
            <MultiTags label={L("מבטאים", "Accents")} o={o} options={ACCENTS} value={f.accents} onChange={(v) => onChange({ ...f, accents: v })} />
            <MultiTags label={L("סוג קול", "Voice type")} o={o} options={VOICE} value={f.voiceTypes} onChange={(v) => onChange({ ...f, voiceTypes: v as VoiceType[] })} />
          </Section>

          <Section title={L("כישורים", "Skills")}>
            {SKILL_GROUPS_.map((g) => (
              <MultiTags key={g.id} label={he ? g.he : g.en} o={o} options={g.options} value={f.skills} onChange={(v) => onChange({ ...f, skills: v })} />
            ))}
            <MultiTags label={L("ז׳אנרים", "Genres")} o={o} options={GENRES} value={f.genres} onChange={(v) => onChange({ ...f, genres: v })} />
          </Section>

          <Section title={L("קריירה וזמינות", "Career & availability")}>
            <MultiTags label={L("ניסיון", "Experience")} o={o} options={LEVELS} value={f.experienceLevels} onChange={(v) => onChange({ ...f, experienceLevels: v as ExperienceLevel[] })} />
            <MultiTags label={L("איגוד", "Union status")} o={o} options={UNION} value={f.unionStatus} onChange={(v) => onChange({ ...f, unionStatus: v as UnionStatus[] })} />
            <MultiTags label={L("מיקום", "Location")} o={o} options={LOCATIONS} value={f.locations} onChange={(v) => onChange({ ...f, locations: v })} />
            <MultiTags label={L("היתר עבודה", "Work permit")} o={o} options={WORK_PERMITS} value={f.workPermits} onChange={(v) => onChange({ ...f, workPermits: v })} />
            <Switch label={L("מוכנים לנסוע לצילומים", "Willing to travel")} value={f.mustTravel} onChange={(v) => onChange({ ...f, mustTravel: v })} />
            <Switch label={L("עם רישיון נהיגה", "Has a driver's licence")} value={f.needsLicense} onChange={(v) => onChange({ ...f, needsLicense: v })} />
            <Switch label={L("מיוצגים על ידי סוכן", "Represented by an agent")} value={f.needsAgent} onChange={(v) => onChange({ ...f, needsAgent: v })} />
          </Section>

          <Section title={L("פרופיל", "Profile")}>
            <Switch label={L("רק עם סרטון בפרופיל", "Only with a video")} value={f.hasVideo} onChange={(v) => onChange({ ...f, hasVideo: v })} />
            <Switch label={L("רק פרופילים מאומתים", "Verified only")} value={f.verifiedOnly} onChange={(v) => onChange({ ...f, verifiedOnly: v })} />
          </Section>
        </div>

        <div className="p-5 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-gold text-on-accent font-semibold inline-flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> {t("srch.showMatches", { n: results })}
          </button>
        </div>
      </motion.div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[0.6875rem] uppercase tracking-widest text-gold font-semibold mb-3">{title}</div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function MultiTags({ label, options, value, onChange, o = (v) => v }: { label: string; options: readonly string[]; value: string[]; onChange: (v: string[]) => void; o?: (v: string) => string }) {
  return (
    <div>
      <div className="text-[0.6875rem] text-text-muted mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value.includes(opt);
          return (
            <button
              key={opt}
              aria-pressed={active}
              onClick={() => onChange(active ? value.filter((v) => v !== opt) : [...value, opt])}
              className={cn(
                "h-8 px-3 rounded-full text-xs border transition-colors",
                active ? "border-gold bg-gold/15 text-gold" : "border-border bg-bg text-text-muted hover:border-border-strong"
              )}
            >
              {o(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RangeRow({
  label, min, max, value, suffix, onChange, onClear, active, he,
}: {
  label: string; min: number; max: number; value: [number, number]; suffix: string;
  onChange: (v: [number, number]) => void; onClear: () => void; active: boolean; he?: boolean;
}) {
  const [lo, hi] = value;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[0.6875rem] text-text-muted">{label}</div>
        <div className="text-[0.6875rem] tnum">
          {active ? <span className="text-gold font-semibold">{lo}–{hi} {suffix}</span> : <span className="text-text-subtle">{he ? "הכול" : "Any"}</span>}
          {active && (
            <button onClick={onClear} className="ms-2 text-text-muted underline text-[0.6875rem]">{he ? "ניקוי" : "clear"}</button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="range" min={min} max={max} value={lo}
          onChange={(e) => onChange([Math.min(+e.target.value, hi), hi])}
          aria-label={`${label} min`}
          className="w-full"
        />
        <input
          type="range" min={min} max={max} value={hi}
          onChange={(e) => onChange([lo, Math.max(+e.target.value, lo)])}
          aria-label={`${label} max`}
          className="w-full"
        />
      </div>
    </div>
  );
}

function Switch({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between gap-3 px-1 py-1 text-sm">
      <span>{label}</span>
      <span className={cn("w-11 h-6 rounded-full relative transition-colors shrink-0", value ? "bg-gold" : "bg-bg-muted")}>
        <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-bg transition-all", value ? "start-5" : "start-0.5")} />
      </span>
    </button>
  );
}
