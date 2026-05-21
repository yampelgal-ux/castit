"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Film, Tv, Megaphone, Award, Calendar, Settings, FolderOpen,
  CheckCircle2, X, Plus, Edit3, ChevronRight,
} from "lucide-react";
import { Header } from "@/components/Header";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useStore } from "@/lib/store";
import {
  loadProjects, loadSubmissions, type Project,
} from "@/lib/projects-store";
import type { ProPublicCredit } from "@/lib/store";
import { cn } from "@/lib/utils";

const SPECS = ["Film", "TV", "Commercial", "Theater", "Music Video", "Short Film"] as const;

// Pro profile — replaces talent widgets (streak, viewers, reels) with
// industry-relevant signals: studio, specialization, filmography, active castings.
export function ProProfileView({ isMe, displayName, photoUrl, bio }: {
  isMe: boolean;
  displayName: string;
  photoUrl?: string;
  bio?: string;
}) {
  const { profile, setProfile } = useStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [subs, setSubs] = useState<ReturnType<typeof loadSubmissions>>([]);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    setProjects(loadProjects());
    setSubs(loadSubmissions());
  }, []);

  const stats = useMemo(() => {
    const active = projects.filter((p) => p.status !== "closed").length;
    const booked = subs.filter((s) => s.stage === "booked").length;
    const callbacksSent = subs.filter((s) => s.stage === "callback" || s.stage === "booked" || s.stage === "offered" || s.stage === "avail_check").length;
    return { active, booked, callbacksSent };
  }, [projects, subs]);

  const initials = (displayName || "?").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const openCastings = projects.filter((p) => p.status !== "closed");

  return (
    <div>
      <Header
        back={!isMe}
        title={`@${profile.username || "pro"}`}
        right={isMe && (
          <button onClick={() => setShowEdit(true)} className="text-text-muted">
            <Settings className="w-5 h-5" />
          </button>
        )}
      />

      {/* Hero — no cover photo, clean studio aesthetic */}
      <div className="px-5 pt-6">
        <div className="flex items-start gap-4">
          {photoUrl ? (
            <img src={photoUrl} alt={displayName} className="w-20 h-20 rounded-2xl object-cover border border-border" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-bg-elevated border border-border grid place-items-center font-display text-2xl text-gold">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display text-2xl leading-tight truncate">{displayName}</h1>
              <VerifiedBadge />
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-plum/20 text-plum-light font-semibold tracking-wider">PRO</span>
            </div>
            {profile.studio && (
              <p className="text-sm text-text-muted mt-0.5 truncate">
                <Briefcase className="w-3 h-3 inline mr-1 align-text-bottom" />
                {profile.studio}
              </p>
            )}
            {profile.specialization && profile.specialization.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {profile.specialization.map((s) => (
                  <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full bg-bg-elevated border border-border text-text-muted">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {bio && <p className="text-sm text-text-muted mt-4 leading-relaxed">{bio}</p>}

        {/* Pro-relevant stats — replaces Followers/Likes/Submissions */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <Stat icon={FolderOpen} label="Active" value={stats.active} hint="projects" />
          <Stat icon={Award} label="Booked" value={profile.showBookingsCount !== false ? stats.booked : "—"} hint="all-time" />
          <Stat icon={Calendar} label="Years" value={profile.yearsActive || "—"} hint="active" />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          {isMe ? (
            <>
              <button
                onClick={() => setShowEdit(true)}
                className="flex-1 h-11 rounded-full bg-bg-elevated border border-border text-sm font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" /> Edit profile
              </button>
              <Link
                href="/pro/dashboard"
                className="h-11 px-4 rounded-full bg-gold text-bg text-sm font-semibold inline-flex items-center gap-1.5"
              >
                Studio <ChevronRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            // Talent viewing a Pro: no Follow/DM — only "View open castings"
            <Link
              href="/opportunities"
              className="flex-1 h-11 rounded-full bg-gold text-bg text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              View open castings ({openCastings.length})
            </Link>
          )}
        </div>
      </div>

      {/* Filmography */}
      <div className="px-5 mt-6 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-text-muted">Filmography</h2>
          {isMe && (
            <button onClick={() => setShowEdit(true)} className="text-[11px] text-gold font-semibold inline-flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>
        {!profile.filmography || profile.filmography.length === 0 ? (
          <div className="rounded-2xl bg-bg-elevated border border-dashed border-border p-5 text-center">
            <Film className="w-8 h-8 text-text-muted mx-auto opacity-50" />
            <p className="text-sm text-text-muted mt-2">
              {isMe ? "Add notable projects you've cast." : "No public filmography yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {profile.filmography.map((c) => <CreditRow key={c.id} c={c} />)}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showEdit && <EditProSheet onClose={() => setShowEdit(false)} />}
      </AnimatePresence>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: any; label: string; value: number | string; hint: string }) {
  return (
    <div className="rounded-2xl bg-bg-elevated border border-border p-3">
      <Icon className="w-3.5 h-3.5 text-gold mb-1" />
      <div className="font-display text-xl tnum leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-text-muted mt-0.5">{label}</div>
      <div className="text-[9px] text-text-subtle">{hint}</div>
    </div>
  );
}

function CreditRow({ c }: { c: ProPublicCredit }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-bg-elevated border border-border">
      <div className="w-10 h-10 rounded-xl bg-plum/20 text-plum-light grid place-items-center shrink-0">
        <Film className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{c.title}</div>
        <div className="text-[11px] text-text-muted">{c.year || "—"} · {c.role || "Casting"}</div>
      </div>
    </div>
  );
}

function EditProSheet({ onClose }: { onClose: () => void }) {
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
          <F label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
          </F>
          <F label="Studio / agency">
            <input value={studio} onChange={(e) => setStudio(e.target.value)}
              placeholder="e.g. Northwind Pictures"
              className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
          </F>
          <F label="Years active">
            <input
              type="number" min={0}
              value={yearsActive}
              onChange={(e) => setYearsActive(e.target.value ? Number(e.target.value) : "")}
              className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
          </F>
          <F label="Bio (1–2 sentences)">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
          </F>
          <F label="Specialization">
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
          </F>

          <F label="Filmography">
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
          </F>

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

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-text-muted">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
