"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ClipboardCheck, Plus, Copy, Check, ThumbsUp, ThumbsDown, HelpCircle,
  ExternalLink, Trash2, Eye, Send, Wand2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import {
  loadProjects, loadRoles, loadSubmissions,
  type Project, type Role, type Submission,
} from "@/lib/projects-store";
import {
  loadApprovalSessions, createApprovalSession, deleteApprovalSession,
  type ApprovalSession,
} from "@/lib/approval-store";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Step = "list" | "build";

export default function ProApprovalsPage() {
  const [step, setStep] = useState<Step>("list");
  const [sessions, setSessions] = useState<ApprovalSession[]>([]);

  useEffect(() => { setSessions(loadApprovalSessions()); }, []);

  function reload() { setSessions(loadApprovalSessions()); }

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header
        back
        title="Director Reviews"
        right={
          step === "list" ? (
            <button
              onClick={() => setStep("build")}
              className="text-[11px] text-gold font-semibold inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> חדש
            </button>
          ) : (
            <button onClick={() => setStep("list")} className="text-[11px] text-text-muted">
              חזור
            </button>
          )
        }
      />

      {step === "list" ? (
        <SessionsList sessions={sessions} onChange={reload} />
      ) : (
        <BuildSession onCreated={() => { reload(); setStep("list"); }} />
      )}
    </div>
  );
}

function SessionsList({ sessions, onChange }: { sessions: ApprovalSession[]; onChange: () => void }) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        tone="gold"
        title="עדיין אין סשני אישור"
        description='לאחר שאתה מסקור טייפים, צור "Director Review" — בחר 5 טייפים ושלח קישור לבמאי. הוא מצביע 👍/🤔/👎 על כל אחד, וההצבעה מסתנכרנת אליך.'
        ctaLabel="צור סשן ראשון"
        ctaOnClick={onChange}
      />
    );
  }

  return (
    <div className="px-4 pt-4 space-y-3">
      {sessions.map((s, i) => (
        <SessionRow key={s.id} session={s} i={i} onChange={onChange} />
      ))}
    </div>
  );
}

function SessionRow({ session, i, onChange }: { session: ApprovalSession; i: number; onChange: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/approve/${session.slug}` : `/approve/${session.slug}`;

  const counts = useMemo(() => ({
    yes:   session.talents.filter((t) => t.vote === "yes").length,
    maybe: session.talents.filter((t) => t.vote === "maybe").length,
    no:    session.talents.filter((t) => t.vote === "no").length,
    total: session.talents.length,
  }), [session]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  function remove() {
    if (!confirm(`למחוק סשן "${session.projectTitle}"?`)) return;
    deleteApprovalSession(session.id);
    onChange();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="rounded-2xl bg-bg-elevated border border-border overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">Review</div>
            <h3 className="font-display text-base leading-tight mt-0.5 truncate">{session.projectTitle}</h3>
            {session.roleName && (
              <p className="text-[11px] text-text-muted truncate">{session.roleName}</p>
            )}
          </div>
          <button onClick={remove} className="text-text-muted">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-3">
          <Stat label="Tapes" value={counts.total} tone="muted" />
          <Stat label="Yes"   value={counts.yes}   tone="success" />
          <Stat label="Maybe" value={counts.maybe} tone="gold" />
          <Stat label="No"    value={counts.no}    tone="danger" />
        </div>

        <div className="text-[10px] text-text-subtle mt-3">
          {session.views.length} views · {counts.yes + counts.maybe + counts.no}/{counts.total} voted
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 border-t border-border bg-bg/40">
        <button
          onClick={copyUrl}
          className="h-9 rounded-xl bg-gold text-bg text-xs font-semibold inline-flex items-center justify-center gap-1.5"
        >
          {copied ? <><Check className="w-3.5 h-3.5" /> הועתק</> : <><Copy className="w-3.5 h-3.5" /> העתק קישור</>}
        </button>
        <Link
          href={`/approve/${session.slug}`}
          target="_blank"
          className="h-9 rounded-xl bg-bg-elevated border border-border text-xs font-semibold inline-flex items-center justify-center gap-1.5 text-text-muted"
        >
          <ExternalLink className="w-3.5 h-3.5" /> פתח
        </Link>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "gold" | "success" | "danger" | "muted" }) {
  const cls = tone === "gold" ? "text-gold" : tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-text";
  return (
    <div className="text-center">
      <div className={cn("font-display text-base tnum", cls)}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-text-muted">{label}</div>
    </div>
  );
}

// ─── Build session ─────────────────────────────────────
function BuildSession({ onCreated }: { onCreated: () => void }) {
  const { profile } = useStore();
  const [project, setProject] = useState<Project | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [greeting, setGreeting] = useState("Hey — picked 5 tapes for your review. Tag each yes/maybe/no, I'll see the results in real time.");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const projects = useMemo(() => loadProjects(), []);
  const roles = useMemo(() => project ? loadRoles().filter((r) => r.projectId === project.id) : [], [project]);
  const subs = useMemo(() => {
    if (!role) return [];
    return loadSubmissions()
      .filter((s) => s.roleId === role.id && s.tapes.length > 0)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [role]);

  function toggleSubmission(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function commit() {
    if (!project || selected.size === 0) return;
    const selectedSubs = subs.filter((s) => selected.has(s.id));
    createApprovalSession({
      proName: profile.name,
      projectTitle: project.title,
      roleName: role?.name,
      greeting,
      talents: selectedSubs.map((s) => {
        const lastTape = s.tapes[s.tapes.length - 1];
        return {
          submissionId: s.id,
          talentId: s.talentId,
          talentName: s.talentName,
          talentPhoto: s.talentPhoto,
          roleName: role?.name ?? "",
          tapeBlobKey: lastTape?.tapeBlobKey,
          tapeUrl: lastTape?.videoUrl,
        };
      }),
    });
    onCreated();
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      <div>
        <Label>Project</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => { setProject(p); setRole(null); setSelected(new Set()); }}
              className={cn(
                "px-3 h-8 rounded-full text-xs font-semibold",
                project?.id === p.id ? "bg-gold text-bg" : "bg-bg-elevated border border-border text-text"
              )}
            >{p.title}</button>
          ))}
          {projects.length === 0 && (
            <p className="text-xs text-text-muted">אין פרויקטים. צור פרויקט קודם.</p>
          )}
        </div>
      </div>

      {project && roles.length > 0 && (
        <div>
          <Label>Role (אופציונלי)</Label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => { setRole(r); setSelected(new Set()); }}
                className={cn(
                  "px-3 h-8 rounded-full text-xs font-semibold",
                  role?.id === r.id ? "bg-gold text-bg" : "bg-bg-elevated border border-border text-text"
                )}
              >{r.name}</button>
            ))}
          </div>
        </div>
      )}

      {role && (
        <div>
          <Label>Choose tapes ({selected.size} selected)</Label>
          <div className="mt-2 space-y-2">
            {subs.length === 0 ? (
              <p className="text-xs text-text-muted">אין טייפים עדיין בתפקיד הזה.</p>
            ) : subs.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleSubmission(s.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-2xl border transition text-right",
                  selected.has(s.id)
                    ? "bg-gold/10 border-gold/40"
                    : "bg-bg-elevated border-border"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-md grid place-items-center shrink-0 border",
                  selected.has(s.id) ? "bg-gold border-gold" : "border-border"
                )}>
                  {selected.has(s.id) && <Check className="w-3 h-3 text-bg" strokeWidth={3} />}
                </div>
                <img src={s.talentPhoto} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{s.talentName}</div>
                  <div className="text-[10px] text-text-muted">
                    {s.tapes.length} round{s.tapes.length > 1 ? "s" : ""} · {s.stage}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Greeting (אופציונלי)</Label>
        <textarea
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          rows={3}
          className="w-full mt-1.5 px-3 py-2 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
          dir="auto"
        />
      </div>

      <button
        onClick={commit}
        disabled={!project || selected.size === 0}
        className={cn(
          "w-full h-12 rounded-2xl font-semibold inline-flex items-center justify-center gap-2",
          selected.size > 0 && project ? "bg-gold text-bg" : "bg-bg text-text-subtle"
        )}
      >
        <Send className="w-4 h-4" /> צור קישור לבמאי
      </button>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-widest text-text-muted">{children}</div>;
}
