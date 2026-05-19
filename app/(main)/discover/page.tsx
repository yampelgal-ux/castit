"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X, Sparkles, Bookmark, BookmarkCheck, Star } from "lucide-react";
import { TALENTS } from "@/lib/mock-data";
import { SKIN_TONES, EYE_COLORS, HAIR_COLORS } from "@/lib/typecast-palette";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useStore } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";

const QUICK = ["All", "Drama", "Comedy", "Action", "Modeling", "Voice"];
const LANGUAGES = ["English", "Hebrew", "Arabic", "Russian", "French", "German", "Spanish"];
const SKILLS = ["Drama", "Improv", "Singing", "Dance", "Krav Maga", "Horseback Riding", "Surfing", "Skateboarding", "Boxing", "Guitar", "Piano"];

type Filters = {
  heightMin: number;
  heightMax: number;
  skinTone: string | null;
  eyeColor: string | null;
  hairColor: string | null;
  gender: string | null;
  languages: string[];
  skills: string[];
};

const DEFAULT_FILTERS: Filters = {
  heightMin: 150,
  heightMax: 200,
  skinTone: null,
  eyeColor: null,
  hairColor: null,
  gender: null,
  languages: [],
  skills: [],
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function colorScore(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const dist = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  return Math.max(0, 1 - dist / 441);
}

function calculateMatch(talent: typeof TALENTS[number], filters: Filters): number {
  const scores: number[] = [];

  if (filters.gender) scores.push(talent.typecast.gender === filters.gender ? 1 : 0);

  if (filters.heightMin > 150 || filters.heightMax < 200) {
    const h = talent.typecast.heightCm;
    if (h >= filters.heightMin && h <= filters.heightMax) scores.push(1);
    else scores.push(Math.max(0, 1 - (h < filters.heightMin ? filters.heightMin - h : h - filters.heightMax) / 20));
  }

  if (filters.skinTone) scores.push(colorScore(filters.skinTone, talent.typecast.skinTone));
  if (filters.eyeColor) scores.push(colorScore(filters.eyeColor, talent.typecast.eyeColor));
  if (filters.hairColor) scores.push(colorScore(filters.hairColor, talent.typecast.hairColor));

  if (filters.languages.length > 0) {
    const matched = filters.languages.filter((l) => talent.typecast.languages.includes(l)).length;
    scores.push(matched / filters.languages.length);
  }

  if (filters.skills.length > 0) {
    const matched = filters.skills.filter((s) =>
      talent.typecast.skills.some((ts) => ts.toLowerCase().includes(s.toLowerCase()))
    ).length;
    scores.push(matched / filters.skills.length);
  }

  if (scores.length === 0) return 100;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100);
}

function hasActiveFilters(f: Filters): boolean {
  return f.heightMin > 150 || f.heightMax < 200 || !!f.skinTone || !!f.eyeColor || !!f.hairColor || !!f.gender || f.languages.length > 0 || f.skills.length > 0;
}

function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.heightMin > 150 || f.heightMax < 200) n++;
  if (f.skinTone) n++;
  if (f.eyeColor) n++;
  if (f.hairColor) n++;
  if (f.gender) n++;
  if (f.languages.length > 0) n++;
  if (f.skills.length > 0) n++;
  return n;
}

// Featured/sponsored talent slot — injected at grid position 3
const FEATURED_TALENT = TALENTS[0];

export default function DiscoverPage() {
  const { savedSearches, saveSearch, deleteSavedSearch } = useStore();
  const [quick, setQuick] = useState("All");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [searchName, setSearchName] = useState("");

  const filtersActive = hasActiveFilters(filters);

  const results = useMemo(() => {
    const scored = TALENTS.map((t) => ({
      talent: t,
      score: calculateMatch(t, filters),
    })).filter(({ talent, score }) => {
      if (search && !talent.name.toLowerCase().includes(search.toLowerCase()) &&
          !talent.username.toLowerCase().includes(search.toLowerCase())) return false;
      if (quick !== "All" && !talent.typecast.genres.includes(quick)) return false;
      if (filtersActive && score < 40) return false;
      return true;
    });

    if (filtersActive) scored.sort((a, b) => b.score - a.score);
    return scored;
  }, [search, quick, filters, filtersActive]);

  function filtersAsRecord(): Record<string, unknown> {
    return { ...filters, quick, search };
  }

  function loadSavedSearch(sf: typeof savedSearches[number]) {
    const f = sf.filters as Record<string, unknown>;
    setFilters({
      heightMin: (f.heightMin as number) ?? 150,
      heightMax: (f.heightMax as number) ?? 200,
      skinTone: (f.skinTone as string | null) ?? null,
      eyeColor: (f.eyeColor as string | null) ?? null,
      hairColor: (f.hairColor as string | null) ?? null,
      gender: (f.gender as string | null) ?? null,
      languages: (f.languages as string[]) ?? [],
      skills: (f.skills as string[]) ?? [],
    });
    if (f.quick) setQuick(f.quick as string);
  }

  // Insert featured card at index 3 if no active filters
  function buildGrid() {
    if (filtersActive || results.length === 0) return { items: results, featuredIdx: -1 };
    return { items: results, featuredIdx: Math.min(3, results.length) };
  }

  const { items, featuredIdx } = buildGrid();

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 glass border-b border-border px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 h-11 px-4 rounded-full bg-bg-elevated border border-border focus-within:border-gold/40 transition-colors">
            <Search className="w-4 h-4 text-text-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search talents"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-text-subtle"
            />
          </div>
          {filtersActive && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="w-11 h-11 grid place-items-center rounded-full bg-bg-elevated border border-gold/30 text-gold"
              title="Save this search"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowFilters(true)}
            className={cn(
              "relative w-11 h-11 grid place-items-center rounded-full border transition-colors",
              filtersActive ? "bg-gold/10 border-gold/40 text-gold" : "bg-bg-elevated border-border"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {filtersActive && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-gold text-bg text-[9px] font-bold grid place-items-center px-1">
                {countActiveFilters(filters)}
              </span>
            )}
          </button>
        </div>

        {/* Quick filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar -mx-1 px-1">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setQuick(q)}
              className={cn(
                "shrink-0 px-3.5 h-8 rounded-full text-xs font-medium border transition-all",
                quick === q ? "bg-gold text-bg border-gold" : "bg-transparent text-text-muted border-border"
              )}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Saved searches */}
        {savedSearches.length > 0 && (
          <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {savedSearches.map((ss) => (
              <button
                key={ss.id}
                onClick={() => loadSavedSearch(ss)}
                className="shrink-0 h-7 px-3 rounded-full text-[11px] font-medium border border-gold/30 text-gold bg-gold/8 flex items-center gap-1.5"
              >
                <BookmarkCheck className="w-3 h-3" />
                {ss.name}
                <span
                  onClick={(e) => { e.stopPropagation(); deleteSavedSearch(ss.id); }}
                  className="ml-0.5 text-text-muted hover:text-text"
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Match insight banner */}
      {filtersActive && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 p-3 rounded-2xl bg-gradient-to-r from-gold/10 to-violet/10 border border-gold/20 flex items-center gap-3"
        >
          <Sparkles className="w-4 h-4 text-gold shrink-0" />
          <p className="text-xs text-text">
            <span className="font-semibold">Sorted by Typecast match.</span>{" "}
            <span className="text-text-muted">Showing talents with ≥40% fit.</span>
          </p>
        </motion.div>
      )}

      {/* Results */}
      <div className="px-4 pt-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-text-muted tnum">{results.length} talents</p>
          {filtersActive && (
            <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-[11px] text-gold font-medium">
              Clear filters
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
            <Search className="w-10 h-10 opacity-30" />
            <p className="text-sm">No matches found</p>
            <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-xs text-gold mt-2">
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.flatMap(({ talent: t, score }, i) => {
              const cards = [];

              // Inject featured slot
              if (i === featuredIdx) {
                cards.push(
                  <div
                    key="featured"
                    className="col-span-2 rounded-2xl overflow-hidden bg-gradient-to-r from-gold/15 to-violet/15 border border-gold/30 p-4 flex items-center gap-4"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={FEATURED_TALENT.photo}
                        alt={FEATURED_TALENT.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gold/40"
                      />
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-gold text-bg text-[8px] font-bold uppercase tracking-wide">
                        Featured
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm">{FEATURED_TALENT.name}</span>
                        {FEATURED_TALENT.verified && <VerifiedBadge />}
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">{FEATURED_TALENT.bio}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Star className="w-3 h-3 text-gold fill-gold" />
                        <span className="text-[10px] text-gold font-semibold">Spotlight talent this week</span>
                      </div>
                    </div>
                    <Link
                      href={`/profile/${FEATURED_TALENT.username}`}
                      className="shrink-0 h-9 px-3 rounded-full bg-gold text-bg text-xs font-semibold grid place-items-center"
                    >
                      View
                    </Link>
                  </div>
                );
              }

              cards.push(
                <Link
                  key={t.id}
                  href={`/profile/${t.username}`}
                  className="rounded-2xl overflow-hidden bg-bg-elevated border border-border relative group"
                >
                  <div className="aspect-[3/4] relative">
                    <img
                      src={t.photo}
                      alt={t.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

                    {filtersActive && (
                      <div className={cn(
                        "absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold tnum backdrop-blur",
                        score >= 80 ? "bg-success/90 text-white"
                          : score >= 60 ? "bg-gold/90 text-bg"
                          : "bg-bg/80 text-text border border-border"
                      )}>
                        {score}%
                      </div>
                    )}

                    {t.verified && (
                      <div className="absolute top-2 right-2">
                        <VerifiedBadge />
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 right-2 space-y-1">
                      <div className="text-sm font-semibold text-white truncate">{t.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-white/80">
                        <span className="tnum">{t.typecast.heightCm}cm</span>
                        <span>·</span>
                        <span className="truncate">{t.typecast.gender}</span>
                        <span>·</span>
                        <span className="tnum">{formatNumber(t.followers)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );

              return cards;
            })}
          </div>
        )}
      </div>

      {/* Filter sheet */}
      <AnimatePresence>
        {showFilters && (
          <FilterSheet
            filters={filters}
            setFilters={setFilters}
            onClose={() => setShowFilters(false)}
            resultCount={results.length}
          />
        )}
      </AnimatePresence>

      {/* Save search modal */}
      <AnimatePresence>
        {showSaveModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setShowSaveModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-6 top-1/3 z-50 max-w-[380px] mx-auto bg-bg-elevated border border-border rounded-3xl p-6 space-y-4"
            >
              <h3 className="font-display text-xl">Save this search</h3>
              <input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="e.g. 'Film noir, female, NY'"
                className="w-full h-12 px-4 rounded-2xl bg-bg border border-border outline-none text-sm focus:border-gold/50"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 h-11 rounded-2xl border border-border text-sm text-text-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (searchName.trim()) {
                      saveSearch(searchName.trim(), filtersAsRecord());
                      setSearchName("");
                      setShowSaveModal(false);
                    }
                  }}
                  disabled={!searchName.trim()}
                  className="flex-1 h-11 rounded-2xl bg-gold text-bg font-semibold disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterSheet({
  filters, setFilters, onClose, resultCount,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  onClose: () => void;
  resultCount: number;
}) {
  function toggleArray(key: "languages" | "skills", value: string) {
    const arr = filters[key];
    setFilters({ ...filters, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] });
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 inset-x-0 z-50 max-w-[440px] mx-auto bg-bg-elevated border-t border-border rounded-t-3xl"
      >
        <div className="p-5">
          <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-xl">Typecast filters</h3>
              <p className="text-[11px] text-text-muted mt-0.5">Match talent by physical & creative traits</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-7 max-h-[62vh] overflow-y-auto no-scrollbar pr-1">
            {/* Height */}
            <Section title="Height" value={`${filters.heightMin}–${filters.heightMax} cm`}>
              <div className="space-y-2">
                {["heightMin", "heightMax"].map((key) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-[10px] text-text-muted w-8">{key === "heightMin" ? "Min" : "Max"}</span>
                    <input
                      type="range" min={140} max={210}
                      value={filters[key as "heightMin" | "heightMax"]}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setFilters(key === "heightMin"
                          ? { ...filters, heightMin: Math.min(v, filters.heightMax) }
                          : { ...filters, heightMax: Math.max(v, filters.heightMin) }
                        );
                      }}
                      className="flex-1 accent-gold"
                    />
                    <span className="text-xs tnum w-10 text-right">{filters[key as "heightMin" | "heightMax"]}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Gender */}
            <Section title="Gender">
              <div className="flex gap-2 flex-wrap">
                {["Female", "Male", "Non-binary"].map((g) => (
                  <Chip key={g} active={filters.gender === g} onClick={() => setFilters({ ...filters, gender: filters.gender === g ? null : g })}>
                    {g}
                  </Chip>
                ))}
              </div>
            </Section>

            {/* Skin tone */}
            <Section title="Skin tone" hint="Fuzzy match — closest tone counts">
              <ColorSwatchPicker
                label=""
                palette={SKIN_TONES}
                value={filters.skinTone ? [filters.skinTone] : []}
                onChange={(v) => setFilters({ ...filters, skinTone: v[0] ?? null })}
                multi={false}
              />
            </Section>

            {/* Eye color */}
            <Section title="Eye color" hint="Fuzzy match — closest color counts">
              <ColorSwatchPicker
                label=""
                palette={EYE_COLORS}
                value={filters.eyeColor ? [filters.eyeColor] : []}
                onChange={(v) => setFilters({ ...filters, eyeColor: v[0] ?? null })}
                multi={false}
              />
            </Section>

            {/* Hair color */}
            <Section title="Hair color" hint="Fuzzy match — closest color counts">
              <ColorSwatchPicker
                label=""
                palette={HAIR_COLORS}
                value={filters.hairColor ? [filters.hairColor] : []}
                onChange={(v) => setFilters({ ...filters, hairColor: v[0] ?? null })}
                multi={false}
              />
            </Section>

            {/* Languages */}
            <Section title="Languages" hint="Talent must speak at least one">
              <div className="flex gap-2 flex-wrap">
                {LANGUAGES.map((l) => (
                  <Chip key={l} active={filters.languages.includes(l)} onClick={() => toggleArray("languages", l)}>{l}</Chip>
                ))}
              </div>
            </Section>

            {/* Skills */}
            <Section title="Skills">
              <div className="flex gap-2 flex-wrap">
                {SKILLS.map((s) => (
                  <Chip key={s} active={filters.skills.includes(s)} onClick={() => toggleArray("skills", s)}>{s}</Chip>
                ))}
              </div>
            </Section>
          </div>

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="h-12 px-4 rounded-2xl bg-bg border border-border text-sm font-semibold text-text-muted"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl bg-gold text-bg font-semibold"
            >
              Show {resultCount} talent{resultCount === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function Section({ title, hint, value, children }: { title: string; hint?: string; value?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2.5">
        <div>
          <div className="text-xs uppercase tracking-wider text-text font-semibold">{title}</div>
          {hint && <div className="text-[10px] text-text-subtle mt-0.5">{hint}</div>}
        </div>
        {value && <div className="text-xs tnum text-gold font-semibold">{value}</div>}
      </div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3.5 h-9 rounded-full text-xs font-medium border transition-all",
        active ? "bg-gold text-bg border-gold" : "bg-bg border-border text-text hover:border-border-strong"
      )}
    >
      {children}
    </button>
  );
}
