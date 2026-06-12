"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import {
  Briefcase, Film, Award, Calendar, Settings, FolderOpen,
  Plus, Edit3, ChevronRight,
} from "lucide-react";
import { Header } from "@/components/Header";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { EditProProfileSheet } from "@/components/EditProProfileSheet";
import { useStore } from "@/lib/store";
import {
  loadProjects, loadSubmissions, type Project,
} from "@/lib/projects-store";
import type { ProPublicCredit } from "@/lib/store";

// Pro profile — replaces talent widgets (streak, viewers, reels) with
// industry-relevant signals: studio, specialization, filmography, active castings.
export function ProProfileView({ isMe, displayName, photoUrl, bio }: {
  isMe: boolean;
  displayName: string;
  photoUrl?: string;
  bio?: string;
}) {
  const { profile } = useStore();
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
        {showEdit && <EditProProfileSheet onClose={() => setShowEdit(false)} />}
      </AnimatePresence>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint: string;
}) {
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
