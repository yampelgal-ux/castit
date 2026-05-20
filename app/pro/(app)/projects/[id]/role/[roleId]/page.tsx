"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileVideo, CheckCircle2, XCircle, Clock, ChevronRight, Filter } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import {
  getRole, getSubmissionsByRole, type Role, type Submission, type SubmissionStatus,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";

const TABS: { id: SubmissionStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "To review" },
  { id: "callback", label: "Callbacks" },
  { id: "rejected", label: "Passed on" },
];

export default function RoleDetailPage() {
  const { id, roleId } = useParams<{ id: string; roleId: string }>();
  const [role, setRole] = useState<Role | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [tab, setTab] = useState<SubmissionStatus | "all">("all");

  useEffect(() => {
    setRole(getRole(roleId) ?? null);
    setSubs(getSubmissionsByRole(roleId));
  }, [roleId]);

  if (!role) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="Role" />
        <EmptyState icon={FileVideo} title="Not found" />
      </div>
    );
  }

  const filtered = tab === "all" ? subs : subs.filter((s) => s.status === tab);
  const counts = {
    pending: subs.filter((s) => s.status === "pending").length,
    callback: subs.filter((s) => s.status === "callback").length,
    rejected: subs.filter((s) => s.status === "rejected").length,
  };

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header back title={role.name} />

      <div className="px-5 pt-3 space-y-4">
        <div className="rounded-2xl bg-bg-elevated border border-border p-4">
          <div className="text-[10px] uppercase tracking-widest text-gold">Role brief</div>
          <h1 className="font-display text-xl tracking-editorial mt-0.5">{role.name}</h1>
          <p className="text-sm text-text-muted leading-relaxed mt-1">{role.description}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat icon={Clock} label="To review" value={counts.pending} tone="gold" />
          <Stat icon={CheckCircle2} label="Callbacks" value={counts.callback} tone="success" />
          <Stat icon={XCircle} label="Passed on" value={counts.rejected} tone="muted" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap border transition-all",
                tab === t.id ? "bg-gold text-bg border-gold" : "bg-bg-elevated text-text-muted border-border"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={FileVideo}
            title="No submissions"
            description={tab === "all" ? "Tapes will appear here when talents submit." : `No ${tab} tapes yet.`}
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((s, i) => <SubmissionCard key={s.id} s={s} projectId={id} i={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "gold" | "success" | "muted" }) {
  const colors = {
    gold:    "bg-gold/10 text-gold",
    success: "bg-success/10 text-success",
    muted:   "bg-bg text-text-muted",
  }[tone];
  return (
    <div className="rounded-2xl bg-bg-elevated border border-border p-3">
      <div className={cn("w-7 h-7 rounded-lg grid place-items-center mb-1.5", colors)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="font-display text-lg tnum">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-text-muted">{label}</div>
    </div>
  );
}

function SubmissionCard({ s, projectId, i }: { s: Submission; projectId: string; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
    >
      <Link
        href={`/pro/projects/${projectId}/role/${s.roleId}/submission/${s.id}`}
        className="flex items-center gap-3 p-3 rounded-2xl bg-bg-elevated border border-border hover:border-border-strong"
      >
        <img
          src={s.talentPhoto}
          alt={s.talentName}
          className="w-12 h-12 rounded-xl object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{s.talentName}</span>
            <StatusBadge status={s.status} />
          </div>
          <div className="text-[11px] text-text-muted truncate mt-0.5">
            <FileVideo className="w-3 h-3 inline mr-1" />
            {timeAgo(s.submittedAt)}
            {s.note && ` · ${s.note}`}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
      </Link>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const map = {
    pending:  { label: "New",      cls: "bg-gold/15 text-gold border-gold/30" },
    callback: { label: "Callback", cls: "bg-success/15 text-success border-success/30" },
    rejected: { label: "Passed",   cls: "bg-bg text-text-muted border-border" },
  };
  const s = map[status];
  return (
    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-semibold uppercase tracking-wider whitespace-nowrap", s.cls)}>
      {s.label}
    </span>
  );
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}
