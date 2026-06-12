"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Film, X, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { ProPublicCredit } from "@/lib/store";
import { cn } from "@/lib/utils";

const SPECS = ["Film", "TV", "Commercial", "Theater", "Music Video", "Short Film"] as const;

export function EditProProfileSheet({ onClose }: { onClose: () => void }) {
  const { profile, setProfile } = useStore();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [studio, setStudio] = useState(profile.studio ?? "");
  const [yearsActive, setYearsActive] = useState<number | "">(profile.yearsActive ?? "");
  const [specialization, setSpecialization] = useState<string[]>(profile.specialization ?? []);
  const [showBookings, setShowBookings] = useState(profile.showBookingsCount !== false);
  const [filmography, setFilmography] = useState<ProPublicCredit[]>(profile.filmography ?? []);
  const [newTitle, setNewTitle] = useState("");
  const [newYear, setNewYear] = useState("");

  function toggleSpec(s: string) {
    setSpecialization(specialization.includes(s)
      ? specialization.filter((x) => x !== s)
      : [...specialization, s]);
  }
  function addCredit() {
    if (!newTitle.trim()) return;
    setFilmography([
      { id: Math.random().toString(36).slice(2, 9), title: newTitle.trim(), year: newYear.trim() || undefined },
      ...filmography,
    ]);
    setNewTitle(""); setNewYear("");
  }
  function removeCredit(id: string) {
    setFilmography(filmography.filter((c) => c.id !== id));
  }
  function save() {
    setProfile({
      name, bio: bio.trim() || undefined,
      studio: studio.trim() || undefined,
      yearsActive: typeof yearsActive === "number" ? yearsActive : undefined,
      specialization: specialization.length ? specialization as any : undefined,
      filmography,
      showBookingsCount: showBookings,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5 max-h-[90dvh] overflow-y-auto"
      >
        <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">Edit pro profile</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-text-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
          </Field>
          <Field label="Studio / agency">
            <input value={studio} onChange={(e) => setStudio(e.target.value)}
              placeholder="e.g. Northwind Pictures"
              className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
          </Field>
          <Field label="Years active">
            <input
              type="number" min={0}
              value={yearsActive}
              onChange={(e) => setYearsActive(e.target.value ? Number(e.target.value) : "")}
              className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
          </Field>
          <Field label="Bio (1–2 sentences)">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
          </Field>
          <Field label="Specialization">
            <div className="flex flex-wrap gap-1.5">
              {SPECS.map((s) => (
                <button key={s} onClick={() => toggleSpec(s)}
                  className={cn(
                    "h-9 px-3 rounded-full text-xs font-semibold border",
                    specialization.includes(s) ? "bg-gold text-bg border-gold" : "bg-bg text-text border-border"
                  )}
                >{s}</button>
              ))}
            </div>
          </Field>

          <Field label="Filmography">
            <div className="space-y-2">
              {filmography.map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-xl bg-bg border border-border">
                  <Film className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{c.title}</div>
                    {c.year && <div className="text-[10px] text-text-muted">{c.year}</div>}
                  </div>
                  <button onClick={() => removeCredit(c.id)} className="p-1 text-text-muted hover:text-danger">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-1.5">
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Project title"
                  className="flex-1 h-9 px-3 rounded-xl bg-bg border border-border text-xs outline-none focus:border-gold/60" />
                <input value={newYear} onChange={(e) => setNewYear(e.target.value)} placeholder="Year"
                  className="w-16 h-9 px-2 rounded-xl bg-bg border border-border text-xs outline-none focus:border-gold/60" />
                <button onClick={addCredit} disabled={!newTitle.trim()}
                  className={cn(
                    "h-9 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1",
                    newTitle.trim() ? "bg-gold text-bg" : "bg-bg text-text-subtle"
                  )}
                ><Plus className="w-3 h-3" /></button>
              </div>
            </div>
          </Field>

          <label className="flex items-center gap-2 cursor-pointer p-2">
            <input type="checkbox" checked={showBookings} onChange={(e) => setShowBookings(e.target.checked)} />
            <span className="text-sm">Show bookings count on my public profile</span>
          </label>
        </div>

        <button onClick={save} className="mt-5 w-full h-12 rounded-2xl bg-gold text-bg font-semibold">
          Save
        </button>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-text-muted">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
