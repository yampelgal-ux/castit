"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileVideo, Calendar, DollarSign, ChevronRight, ScrollText, Clock, Edit3, Columns,
  Check, X, Zap,
} from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { StageBadge } from "@/components/StageBadge";
import {
  getRole, getProject, getSubmissionsByRole, roleCounts, updateRole,
  confirmBooked, rejectSubmission,
  type Role, type Project, type Submission, type Stage, STAGE_META, type RoleSidesFile,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { SidesFileInput, SidesFileViewer } from "@/components/SidesFileInput";

// Pipeline columns — full mode has all 8 stages, quick mode has 3
const PIPELINE_FULL: { id: "all" | Stage; label: string }[] = [
  { id: "all",         label: "All" },
  { id: "invited",     label: STAGE_META.invited.label },
  { id: "submitted",   label: STAGE_META.submitted.label },
  { id: "callback",    label: STAGE_META.callback.label },
  { id: "hold",        label: STAGE_META.hold.label },
  { id: "avail_check", label: STAGE_META.avail_check.label },
  { id: "offered",     label: STAGE_META.offered.label },
  { id: "booked",      label: STAGE_META.booked.label },
  { id: "rejected",    label: STAGE_META.rejected.label },
];

const PIPELINE_QUICK: { id: "all" | Stage; label: string }[] = [
  { id: "all",       label: "All" },
  { id: "invited",   label: "Invited" },
  { id: "submitted", label: "לסקירה" },
  { id: "booked",    label: "נבחר" },
  { id: "rejected",  label: "נדחה" },
];

export default function RoleDetailPage() {
  const { id, roleId } = useParams<{ id: string; roleId: string }>();
  const [role, setRole] = useState<Role | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [stage, setStage] = useState<"all" | Stage>("all");
  const [editingBrief, setEditingBrief] = useState(false);

  function reload() {
    setRole(getRole(roleId) ?? null);
    setProject(getProject(id) ?? null);
    setSubs(getSubmissionsByRole(roleId));
  }

  useEffect(() => { reload(); }, [roleId, id]);

  const isQuick = project?.mode === "quick";
  const PIPELINE = isQuick ? PIPELINE_QUICK : PIPELINE_FULL;

  if (!role) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="Role" />
        <EmptyState icon={FileVideo} title="Not found" />
      </div>
    );
  }

  const counts = roleCounts(roleId);
  const filtered = stage === "all" ? subs : subs.filter((s) => s.stage === stage);

  // Default order: most urgent first
  const orderRank: Record<Stage, number> = {
    submitted: 0, callback: 1, avail_check: 2, offered: 3, invited: 4,
    hold: 5, booked: 6, rejected: 7,
  };
  const sorted = [...filtered].sort((a, b) =>
    orderRank[a.stage] - orderRank[b.stage] || +new Date(b.createdAt) - +new Date(a.createdAt)
  );

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header back title={role.name} />

      <div className="px-5 pt-3 space-y-4">
        {/* Brief */}
        <div className="rounded-2xl bg-bg-elevated border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest text-gold">Role brief</div>
            <button onClick={() => setEditingBrief(true)} className="text-text-muted">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <h1 className="font-display text-xl tracking-editorial mt-0.5">{role.name}</h1>
          {role.description && <p className="text-sm text-text-muted leading-relaxed mt-1">{role.description}</p>}

          {(role.deadline || role.shootDates || role.payRange) && (
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
              {role.deadline && (
                <Mini icon={Clock} label="Tape due" value={fmtDate(role.deadline)} />
              )}
              {role.shootDates && (
                <Mini icon={Calendar} label="Shoot" value={role.shootDates} />
              )}
              {role.payRange && (
                <Mini icon={DollarSign} label="Pay" value={role.payRange} />
              )}
            </div>
          )}

          {role.sidesFile && (
            <div className="mt-3 pt-3 border-t border-border">
              <SidesFileViewer file={role.sidesFile} />
            </div>
          )}

          {role.sides && (
            <details className="mt-3 pt-3 border-t border-border">
              <summary className="cursor-pointer text-[11px] uppercase tracking-widest text-gold flex items-center gap-1.5">
                <ScrollText className="w-3 h-3" /> Sides
              </summary>
              <pre className="text-xs leading-relaxed mt-2 whitespace-pre-wrap font-mono text-text-muted">{role.sides}</pre>
            </details>
          )}

          {role.selfTapeInstructions && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] uppercase tracking-widest text-gold">
                Self-tape instructions
              </summary>
              <p className="text-xs leading-relaxed mt-2 text-text-muted">{role.selfTapeInstructions}</p>
            </details>
          )}
        </div>

        {/* Optional: compare tapes */}
        {subs.length >= 2 && (
          <Link
            href={`/pro/projects/${id}/role/${roleId}/compare`}
            className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-bg-elevated border border-border hover:border-gold/40 text-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-plum/20 text-plum-light grid place-items-center shrink-0">
              <Columns className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Compare tapes</div>
              <div className="text-[10px] text-text-muted">Optional — view 2–4 talents side-by-side</div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted" />
          </Link>
        )}

        {/* Pipeline summary */}
        {isQuick ? (
          <div className="grid grid-cols-3 gap-2">
            <PipeStat label="לסקירה" value={counts.submitted} tone="gold" />
            <PipeStat label="נבחרו" value={counts.booked} tone="success" />
            <PipeStat label="נדחו" value={counts.rejected ?? 0} tone="sage" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <PipeStat label="To review" value={counts.submitted} tone="gold" />
            <PipeStat label="Callbacks" value={counts.callback} tone="success" />
            <PipeStat label="Hold" value={counts.hold} tone="sage" />
            <PipeStat label="Booked" value={counts.booked} tone="success" />
          </div>
        )}

        {/* Stage tabs */}
        <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 no-scrollbar">
          {PIPELINE.map((t) => {
            const count = t.id === "all" ? counts.total : counts[t.id as Stage];
            if (t.id !== "all" && count === 0) return null;
            return (
              <button
                key={t.id}
                onClick={() => setStage(t.id)}
                className={cn(
                  "px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap border transition-all inline-flex items-center gap-1.5",
                  stage === t.id ? "bg-gold text-bg border-gold" : "bg-bg-elevated text-text-muted border-border"
                )}
              >
                {t.label}
                <span className={cn("tnum", stage === t.id ? "text-bg/70" : "text-text-subtle")}>{count}</span>
              </button>
            );
          })}
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            icon={FileVideo}
            title={subs.length === 0 ? "No submissions yet" : "Nothing in this stage"}
            description={
              subs.length === 0
                ? "Invite talents to read for this role — or share the role publicly to collect tapes."
                : "Switch to another stage to see talents in different parts of the pipeline."
            }
          />
        ) : (
          <div className="space-y-2.5">
            {sorted.map((s, i) => (
              <SubmissionRow
                key={s.id}
                s={s}
                projectId={id}
                i={i}
                isQuick={isQuick}
                onAction={reload}
              />
            ))}
          </div>
        )}
      </div>

      {editingBrief && (
        <EditBriefSheet
          role={role}
          onClose={() => setEditingBrief(false)}
          onSaved={() => { setEditingBrief(false); reload(); }}
        />
      )}
    </div>
  );
}

function Mini({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg/50 border border-border p-2">
      <Icon className="w-3 h-3 text-gold mb-0.5" />
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="text-[11px] font-semibold truncate">{value}</div>
    </div>
  );
}

function PipeStat({ label, value, tone }: { label: string; value: number; tone: "gold" | "success" | "sage" }) {
  const colors = {
    gold:    { bg: "bg-gold/10",    fg: "text-gold" },
    success: { bg: "bg-success/10", fg: "text-success" },
    sage:    { bg: "bg-sage/10",    fg: "text-sage" },
  }[tone];
  return (
    <div className={cn("rounded-2xl border border-border p-2.5", value > 0 ? colors.bg : "bg-bg-elevated")}>
      <div className={cn("font-display text-xl tnum", value > 0 ? colors.fg : "text-text")}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-text-muted">{label}</div>
    </div>
  );
}

function SubmissionRow({
  s, projectId, i, isQuick, onAction,
}: {
  s: Submission;
  projectId: string;
  i: number;
  isQuick: boolean;
  onAction: () => void;
}) {
  const lastTape = s.tapes[s.tapes.length - 1];
  const canQuickDecide = isQuick && s.stage === "submitted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="rounded-2xl bg-bg-elevated border border-border overflow-hidden"
    >
      <Link
        href={`/pro/projects/${projectId}/role/${s.roleId}/submission/${s.id}`}
        className="flex items-center gap-3 p-3 hover:border-gold/40"
      >
        <img src={s.talentPhoto} alt={s.talentName} className="w-12 h-12 rounded-xl object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{s.talentName}</span>
            <StageBadge stage={s.stage} />
            {s.tapes.length > 1 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-bg border border-border text-text-muted">
                R{s.tapes.length}
              </span>
            )}
          </div>
          <div className="text-[11px] text-text-muted truncate mt-0.5">
            {lastTape
              ? <><FileVideo className="w-3 h-3 inline mr-1" />Last tape {timeAgo(lastTape.submittedAt)}</>
              : <>Invited {timeAgo(s.createdAt)}</>}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
      </Link>

      {canQuickDecide && (
        <div className="grid grid-cols-2 gap-1.5 p-2 border-t border-border bg-bg/40">
          <button
            onClick={(e) => {
              e.preventDefault();
              rejectSubmission(s.id);
              haptic("light");
              onAction();
            }}
            className="h-9 rounded-xl bg-bg border border-danger/30 text-danger text-xs font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Pass
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              confirmBooked(s.id);
              haptic("medium");
              onAction();
            }}
            className="h-9 rounded-xl bg-success text-bg text-xs font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Select
          </button>
        </div>
      )}
    </motion.div>
  );
}

function EditBriefSheet({ role, onClose, onSaved }: { role: Role; onClose: () => void; onSaved: () => void }) {
  const [description, setDescription] = useState(role.description);
  const [sides, setSides] = useState(role.sides ?? "");
  const [sidesFile, setSidesFile] = useState<RoleSidesFile | undefined>(role.sidesFile);
  const [instructions, setInstructions] = useState(role.selfTapeInstructions ?? "");
  const [deadline, setDeadline] = useState(role.deadline ?? "");
  const [shootDates, setShootDates] = useState(role.shootDates ?? "");
  const [payRange, setPayRange] = useState(role.payRange ?? "");

  function submit() {
    updateRole(role.id, {
      description,
      sides: sides.trim() || undefined,
      sidesFile,
      selfTapeInstructions: instructions.trim() || undefined,
      deadline: deadline || undefined,
      shootDates: shootDates.trim() || undefined,
      payRange: payRange.trim() || undefined,
    });
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }}
        className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5 max-h-[90dvh] overflow-y-auto"
      >
        <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />
        <h2 className="font-display text-2xl mb-4">Edit role</h2>

        <div className="space-y-3">
          <Field label="Brief">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
          </Field>
          <Field label="Sides (scene text)">
            <textarea value={sides} onChange={(e) => setSides(e.target.value)} rows={4}
              className="w-full px-3 py-2 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60 font-mono" />
          </Field>
          <Field label="Sides file (PDF / DOC)">
            <SidesFileInput
              roleId={role.id}
              value={sidesFile}
              onChange={setSidesFile}
            />
          </Field>
          <Field label="Self-tape instructions">
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Tape deadline">
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
            </Field>
            <Field label="Shoot dates">
              <input value={shootDates} onChange={(e) => setShootDates(e.target.value)}
                className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
            </Field>
          </div>
          <Field label="Pay / Rate">
            <input value={payRange} onChange={(e) => setPayRange(e.target.value)}
              className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
          </Field>
        </div>

        <button onClick={submit}
          className="mt-5 w-full h-12 rounded-2xl bg-gold text-bg font-semibold">
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

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
  catch { return iso; }
}
function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}
