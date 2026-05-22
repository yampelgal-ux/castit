"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { History, ChevronDown, ChevronRight, Award, Ban, Sparkles, FileVideo } from "lucide-react";
import {
  loadSubmissions, loadRoles, loadProjects,
  STAGE_META,
  type Submission, type Role, type Project, type Stage,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";

type Entry = {
  sub: Submission;
  role?: Role;
  project?: Project;
};

const STAGE_ORDER: Stage[] = [
  "invited", "submitted", "callback", "hold", "avail_check", "offered", "booked", "rejected",
];

type Props = {
  talentId: string;
  talentName: string;
};

// Shown on a talent's profile when viewed by a Casting Pro. Lists every
// interaction the pro has had with this talent — projects, stages, outcomes.
// All-localStorage today; will migrate to Supabase later.
export function TalentHistory({ talentId, talentName }: Props) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    const subs = loadSubmissions().filter((s) => s.talentId === talentId);
    if (subs.length === 0) { setEntries([]); return; }
    const rolesById = Object.fromEntries(loadRoles().map((r) => [r.id, r])) as Record<string, Role>;
    const projsById = Object.fromEntries(loadProjects().map((p) => [p.id, p])) as Record<string, Project>;
    const list: Entry[] = subs
      .map((sub) => ({
        sub,
        role: rolesById[sub.roleId],
        project: rolesById[sub.roleId] ? projsById[rolesById[sub.roleId].projectId] : undefined,
      }))
      .sort((a, b) => +new Date(b.sub.createdAt) - +new Date(a.sub.createdAt));
    setEntries(list);
  }, [talentId]);

  const stats = useMemo(() => ({
    total: entries.length,
    booked: entries.filter((e) => e.sub.stage === "booked").length,
    callback: entries.filter((e) => ["callback", "hold", "avail_check", "offered"].includes(e.sub.stage)).length,
    passed: entries.filter((e) => e.sub.stage === "rejected").length,
  }), [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl bg-bg-elevated border border-border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-plum/15 text-plum-light grid place-items-center shrink-0">
          <History className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Your history with {talentName.split(" ")[0]}</div>
          <div className="text-[10px] text-text-muted mt-0.5">
            <span className="tnum">{stats.total}</span> audition{stats.total !== 1 ? "s" : ""}
            {stats.booked > 0 && <span className="text-success font-semibold"> · {stats.booked} booked</span>}
            {stats.callback > 0 && <span className="text-gold font-semibold"> · {stats.callback} in pipeline</span>}
            {stats.passed > 0 && <span className="text-text-subtle"> · {stats.passed} passed</span>}
          </div>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-3 space-y-2">
              {entries.map((e, i) => (
                <HistoryRow key={e.sub.id} entry={e} i={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HistoryRow({ entry, i }: { entry: Entry; i: number }) {
  const { sub, role, project } = entry;
  const meta = STAGE_META[sub.stage];
  const toneCls =
    meta.tone === "success" ? "text-success bg-success/15 border-success/30"
    : meta.tone === "gold" ? "text-gold bg-gold/15 border-gold/30"
    : meta.tone === "plum" ? "text-plum-light bg-plum/15 border-plum/30"
    : meta.tone === "sage" ? "text-sage bg-sage/15 border-sage/30"
    : meta.tone === "violet" ? "text-violet bg-violet/15 border-violet/30"
    : meta.tone === "danger" ? "text-danger bg-danger/15 border-danger/30"
    : "text-text-muted bg-bg border-border";

  const date = new Date(sub.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  const tapeCount = sub.tapes.length;
  const stageIdx = STAGE_ORDER.indexOf(sub.stage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
      className="rounded-xl bg-bg border border-border p-3"
    >
      <div className="flex items-start gap-3">
        {project && (
          <div
            className="w-9 h-9 rounded-lg shrink-0"
            style={{ background: `linear-gradient(135deg, ${project.posterColor}, ${project.posterColor}66)` }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {project?.title ?? "Project"}
              </div>
              <div className="text-[10px] text-text-muted truncate">
                as {role?.name ?? "—"} · {date}
              </div>
            </div>
            <span className={cn("text-[9px] tnum font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", toneCls)}>
              {meta.label}
            </span>
          </div>

          {/* Mini stage timeline — visible up-to-and-including current stage */}
          <div className="flex items-center gap-0.5 mt-2">
            {STAGE_ORDER.filter((s) => s !== "rejected").map((s, idx) => {
              const reached = stageIdx >= idx && sub.stage !== "rejected";
              const isCurrent = sub.stage === s;
              return (
                <span
                  key={s}
                  title={STAGE_META[s].label}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    isCurrent ? "bg-gold"
                      : reached ? "bg-gold/40"
                      : "bg-border"
                  )}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-2 text-[10px] text-text-muted">
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
                <Sparkles className="w-3 h-3" /> Currently in callback
              </span>
            )}
            {project && role && (
              <Link
                href={`/pro/projects/${project.id}/role/${role.id}/submission/${sub.id}`}
                className="ml-auto text-[10px] text-gold font-semibold"
              >
                Open →
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
