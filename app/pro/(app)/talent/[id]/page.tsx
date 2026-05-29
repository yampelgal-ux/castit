"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Award, Ban, Sparkles, FileVideo, ChevronRight, MessageCircle,
  Megaphone, History, TrendingUp, Calendar,
} from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { TalentNotes } from "@/components/TalentNotes";
import { StageBadge } from "@/components/StageBadge";
import { TALENTS } from "@/lib/mock-data";
import {
  loadSubmissions, loadRoles, loadProjects,
  type Submission, type Role, type Project, type Stage, STAGE_META,
} from "@/lib/projects-store";
import { formatNumber } from "@/lib/utils";

type Entry = {
  sub: Submission;
  role: Role;
  project: Project;
};

export default function TalentDossierPage() {
  const { id } = useParams<{ id: string }>();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const talent = useMemo(() => TALENTS.find((t) => t.id === id), [id]);

  useEffect(() => {
    if (!id) return;
    const subs = loadSubmissions().filter((s) => s.talentId === id);
    const rolesById = Object.fromEntries(loadRoles().map((r) => [r.id, r])) as Record<string, Role>;
    const projsById = Object.fromEntries(loadProjects().map((p) => [p.id, p])) as Record<string, Project>;
    const list: Entry[] = subs
      .map((sub) => ({ sub, role: rolesById[sub.roleId], project: rolesById[sub.roleId] ? projsById[rolesById[sub.roleId].projectId] : undefined }))
      .filter((e): e is Entry => !!e.role && !!e.project)
      .sort((a, b) => +new Date(b.sub.createdAt) - +new Date(a.sub.createdAt));
    setEntries(list);
    setLoaded(true);
  }, [id]);

  const stats = useMemo(() => {
    const inPipeline = entries.filter((e) => ["callback", "hold", "avail_check", "offered"].includes(e.sub.stage)).length;
    const booked = entries.filter((e) => e.sub.stage === "booked").length;
    const passed = entries.filter((e) => e.sub.stage === "rejected").length;
    const conv = entries.length > 0 ? Math.round((booked / entries.length) * 100) : 0;
    return { total: entries.length, inPipeline, booked, passed, conv };
  }, [entries]);

  if (!talent) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="Talent" />
        <EmptyState icon={Sparkles} title="Talent not found" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg pb-12">
      <Header
        back
        title={
          <span className="flex items-center gap-1.5">
            <span className="truncate">{talent.name}</span>
            {talent.verified && <VerifiedBadge />}
          </span>
        }
        right={
          <Link
            href={`/profile/${talent.username}`}
            className="text-[11px] text-gold font-semibold"
          >
            פרופיל
          </Link>
        }
      />

      {/* Hero — talent identity */}
      <div className="px-5 pt-4">
        <div className="rounded-2xl bg-bg-elevated border border-border p-4 flex items-center gap-3">
          <img src={talent.photo} alt={talent.name} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display text-xl tracking-editorial truncate">{talent.name}</h1>
              {talent.verified && <VerifiedBadge />}
            </div>
            <p className="text-[11px] text-text-muted truncate">
              {talent.typecast.gender} · {talent.typecast.ageRange[0]}–{talent.typecast.ageRange[1]} · {talent.typecast.heightCm}cm · {talent.typecast.location}
            </p>
            <div className="text-[10px] text-text-subtle mt-1 tnum">
              {formatNumber(talent.followers)} followers
            </div>
          </div>
        </div>
      </div>

      {/* Skills + languages chips */}
      <div className="px-5 mt-3 flex flex-wrap gap-1.5">
        {talent.typecast.languages.map((l) => (
          <span key={l} className="text-[9px] px-2 py-0.5 rounded-full bg-bg-elevated border border-border text-text-muted">{l}</span>
        ))}
        {talent.typecast.skills.slice(0, 6).map((s) => (
          <span key={s} className="text-[9px] px-2 py-0.5 rounded-full bg-bg-elevated border border-border text-gold">{s}</span>
        ))}
      </div>

      {/* Quick stats */}
      <div className="px-5 mt-4 grid grid-cols-4 gap-2">
        <KPI label="Auditions" value={stats.total} tone="muted" />
        <KPI label="Pipeline"  value={stats.inPipeline} tone="gold" />
        <KPI label="Booked"    value={stats.booked} tone="success" />
        <KPI label="Win rate"  value={`${stats.conv}%`} tone="success" />
      </div>

      {/* Quick actions */}
      <div className="px-5 mt-4 grid grid-cols-2 gap-2">
        <Link
          href={`/messages?with=${talent.id}&name=${encodeURIComponent(talent.name)}`}
          className="h-10 rounded-full bg-bg-elevated border border-border text-xs font-semibold inline-flex items-center justify-center gap-1.5"
        >
          <MessageCircle className="w-3.5 h-3.5" /> Message
        </Link>
        <Link
          href="/pro/audition/new"
          className="h-10 rounded-full bg-gold text-bg text-xs font-semibold inline-flex items-center justify-center gap-1.5"
        >
          <Megaphone className="w-3.5 h-3.5" /> Invite
        </Link>
      </div>

      {/* Notes (cross-project private notes) */}
      <div className="px-5 mt-4">
        <TalentNotes talentId={talent.id} talentName={talent.name} />
      </div>

      {/* History — every submission ever */}
      <div className="px-5 mt-5">
        <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2 inline-flex items-center gap-1.5">
          <History className="w-3 h-3" /> ההיסטוריה שלך עם {talent.name.split(" ")[0]}
        </div>
        {!loaded ? null : entries.length === 0 ? (
          <div className="rounded-2xl bg-bg-elevated border border-border p-6 text-center">
            <p className="text-xs text-text-muted">
              עוד לא היו לך אינטראקציות עם {talent.name.split(" ")[0]}. שלח הזמנה לפרויקט כדי להתחיל.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((e, i) => <HistoryRow key={e.sub.id} entry={e} i={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, tone }: { label: string; value: number | string; tone: "gold" | "success" | "muted" }) {
  const cls = tone === "gold" ? "text-gold" : tone === "success" ? "text-success" : "text-text";
  return (
    <div className="rounded-xl bg-bg-elevated border border-border p-2.5 text-center">
      <div className={`font-display text-base font-bold tnum ${cls}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-text-muted">{label}</div>
    </div>
  );
}

function HistoryRow({ entry, i }: { entry: Entry; i: number }) {
  const { sub, role, project } = entry;
  const meta = STAGE_META[sub.stage];
  const date = new Date(sub.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  const tapeCount = sub.tapes.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
    >
      <Link
        href={`/pro/projects/${project.id}/role/${role.id}/submission/${sub.id}`}
        className="block rounded-xl bg-bg-elevated border border-border p-3 hover:border-gold/30 transition"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-lg shrink-0"
            style={{ background: `linear-gradient(135deg, ${project.posterColor}, ${project.posterColor}66)` }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{project.title}</div>
                <div className="text-[10px] text-text-muted truncate">
                  as {role.name} · {date}
                </div>
              </div>
              <StageBadge stage={sub.stage} />
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-muted">
              {tapeCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <FileVideo className="w-3 h-3" /> {tapeCount} tape{tapeCount > 1 ? "s" : ""}
                </span>
              )}
              {sub.stage === "booked" && (
                <span className="inline-flex items-center gap-1 text-success font-semibold">
                  <Award className="w-3 h-3" /> Booked
                </span>
              )}
              {sub.stage === "rejected" && (
                <span className="inline-flex items-center gap-1 text-text-subtle">
                  <Ban className="w-3 h-3" /> Passed
                </span>
              )}
              {sub.stage === "callback" && (
                <span className="inline-flex items-center gap-1 text-gold">
                  <Sparkles className="w-3 h-3" /> Active callback
                </span>
              )}
              <ChevronRight className="w-3 h-3 ml-auto text-text-muted" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
