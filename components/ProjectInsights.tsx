"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, ArrowRight, Users, Clock, Award } from "lucide-react";
import { loadSubmissions, getRolesByProject, projectCounts } from "@/lib/projects-store";
import { cn } from "@/lib/utils";

// Optional analytics panel for a project. Collapsed by default.
export function ProjectInsights({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const roles = getRolesByProject(projectId);
  const allSubs = loadSubmissions().filter((s) => roles.some((r) => r.id === s.roleId));
  const counts = projectCounts(projectId);

  // Conversion funnel: submitted → callback → booked
  const submitted = allSubs.filter((s) => s.tapes.length > 0).length;
  const advanced = allSubs.filter((s) =>
    ["callback", "avail_check", "offered", "booked"].includes(s.stage)
  ).length;
  const callbackRate = submitted > 0 ? Math.round((advanced / submitted) * 100) : 0;
  const bookedRate = submitted > 0 ? Math.round((counts.booked / submitted) * 100) : 0;

  // Average response time: from createdAt to decidedAt
  const decided = allSubs.filter((s) => s.decidedAt);
  const avgResponseMs = decided.length > 0
    ? decided.reduce((sum, s) => sum + (+new Date(s.decidedAt!) - +new Date(s.createdAt)), 0) / decided.length
    : 0;
  const avgResponseDays = avgResponseMs / 86400000;

  // Roles still open vs filled
  const filledRoles = new Set(allSubs.filter((s) => s.stage === "booked").map((s) => s.roleId)).size;
  const openRoles = roles.length - filledRoles;

  return (
    <div className="rounded-2xl border border-border bg-bg-elevated overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 p-3">
        <div className="w-8 h-8 rounded-lg bg-bg grid place-items-center shrink-0">
          <TrendingUp className="w-4 h-4 text-text-muted" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold">Project insights</div>
          <div className="text-[10px] text-text-muted">
            Optional analytics · funnel, response time, fill rate
          </div>
        </div>
        <span className={cn("text-text-muted text-xs transition-transform", open ? "rotate-180" : "")}>▾</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-border pt-3 space-y-3">
              {/* Funnel */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2">
                  Conversion funnel
                </div>
                <FunnelRow label="Submissions"  value={allSubs.length} total={Math.max(allSubs.length, 1)} tone="muted" />
                <FunnelRow label="Tapes received"  value={submitted} total={Math.max(allSubs.length, 1)} tone="gold" />
                <FunnelRow label="Advanced (callback+)"  value={advanced} total={Math.max(submitted, 1)} pct={callbackRate} tone="plum" />
                <FunnelRow label="Booked"  value={counts.booked} total={Math.max(submitted, 1)} pct={bookedRate} tone="success" />
              </div>

              {/* Numbers */}
              <div className="grid grid-cols-3 gap-2">
                <Stat icon={Users} label="Roles" value={`${filledRoles}/${roles.length}`} hint={`${openRoles} open`} />
                <Stat icon={Clock} label="Avg response" value={avgResponseDays > 0 ? `${avgResponseDays.toFixed(1)}d` : "—"} hint="to decide" />
                <Stat icon={Award} label="Hit rate" value={bookedRate > 0 ? `${bookedRate}%` : "—"} hint="of tapes" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FunnelRow({
  label, value, total, pct, tone,
}: { label: string; value: number; total: number; pct?: number; tone: "muted" | "gold" | "plum" | "success" }) {
  const fillPct = Math.min(100, Math.round((value / total) * 100));
  const colors = {
    muted:   "bg-text-subtle",
    gold:    "bg-gold",
    plum:    "bg-plum-light",
    success: "bg-success",
  }[tone];
  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-text">{label}</span>
        <span className="text-text-muted tnum">
          {value}{pct != null && ` · ${pct}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-bg overflow-hidden mt-0.5">
        <div className={cn("h-full transition-all", colors)} style={{ width: `${fillPct}%` }} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-bg border border-border p-2.5">
      <Icon className="w-3.5 h-3.5 text-gold mb-1" />
      <div className="font-display text-lg tnum leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-text-muted mt-0.5">{label}</div>
      {hint && <div className="text-[9px] text-text-subtle">{hint}</div>}
    </div>
  );
}
