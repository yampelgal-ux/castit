"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Inbox, Clock, Video, ChevronRight, AlertCircle, CheckCircle2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { StageBadge } from "@/components/StageBadge";
import {
  getAuditionsForTalent, loadSubmissions, type Submission, type Role, type Project,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";

// Demo-mode: in localStorage there's no real "me" talent matching pro invites.
// So when ME_ID has no auditions, we surface ALL submissions across the device
// so the talent can preview the inbox UX from the demo data.
const ME_ID = "me";

type AuditionItem = { submission: Submission; role?: Role; project?: Project };
type TabId = "active" | "history";

export default function InboxPage() {
  const [items, setItems] = useState<AuditionItem[]>([]);
  const [tab, setTab] = useState<TabId>("active");

  useEffect(() => {
    const mine = getAuditionsForTalent(ME_ID);
    if (mine.length > 0) {
      setItems(mine as AuditionItem[]);
    } else {
      const all = loadSubmissions();
      const collected = all.map((s) => {
        const list = getAuditionsForTalent(s.talentId);
        return list.find((x) => x.submission.id === s.id);
      }).filter(Boolean) as AuditionItem[];
      setItems(collected);
    }
  }, []);

  const counts = useMemo(() => ({
    active: items.filter((i) => isActive(i.submission)).length,
    history: items.filter((i) => !isActive(i.submission)).length,
    needTape: items.filter((i) => i.submission.stage === "invited").length,
  }), [items]);

  const shown = items
    .filter((i) => (tab === "active" ? isActive(i.submission) : !isActive(i.submission)))
    .sort((a, b) => urgencyScore(a.submission, a.role) - urgencyScore(b.submission, b.role)
                  || +new Date(b.submission.createdAt) - +new Date(a.submission.createdAt));

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header
        title={
          <span className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-gold" />
            <span className="font-display text-lg">Auditions</span>
          </span>
        }
      />

      <div className="px-5 pt-3 space-y-4">
        <div>
          <h1 className="font-display text-3xl tracking-editorial">
            Your <em className="text-gold-gradient not-italic">audition inbox</em>.
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Every invite, every status, in one place.
          </p>
        </div>

        {counts.needTape > 0 && tab === "active" && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gold/10 border border-gold/30">
            <div className="w-8 h-8 rounded-lg bg-gold/20 text-gold grid place-items-center">
              <Video className="w-4 h-4" />
            </div>
            <div className="flex-1 text-sm">
              <span className="font-semibold text-gold">{counts.needTape} tape{counts.needTape > 1 ? "s" : ""} to record.</span>
              <span className="text-text-muted ml-1">Tap any invite below to start.</span>
            </div>
          </div>
        )}

        <div className="flex gap-1 border-b border-border">
          {([
            { id: "active",  label: "Active",  count: counts.active },
            { id: "history", label: "History", count: counts.history },
          ] as { id: TabId; label: string; count: number }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 h-10 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-px transition-colors inline-flex items-center justify-center gap-2",
                tab === t.id ? "border-gold text-gold" : "border-transparent text-text-muted"
              )}
            >
              {t.label}
              <span className="tnum opacity-70">{t.count}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={tab === "active" ? "No active auditions" : "No history yet"}
            description={
              tab === "active"
                ? "When a casting pro invites you to read for a role, the invite shows up here."
                : "Past auditions you've completed or that were closed appear here."
            }
          />
        ) : (
          <div className="space-y-2.5">
            {shown.map((i, idx) => <AuditionCard key={i.submission.id} item={i} i={idx} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function AuditionCard({ item, i }: { item: AuditionItem; i: number }) {
  const { submission: s, role, project } = item;
  if (!role || !project) return null;
  const needsTape = s.stage === "invited";
  const callbackTape = s.stage === "callback";
  const deadline = role.deadline ? new Date(role.deadline) : null;
  const daysToDeadline = deadline ? Math.ceil((+deadline - Date.now()) / 86400000) : null;
  const urgent = daysToDeadline != null && daysToDeadline >= 0 && daysToDeadline <= 2 && needsTape;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className={cn(
        "rounded-2xl border overflow-hidden",
        urgent ? "border-gold/50 bg-gold/5" : "border-border bg-bg-elevated"
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-gold">{project.type}</div>
            <h3 className="font-display text-lg leading-tight truncate">{project.title}</h3>
            <p className="text-[11px] text-text-muted truncate">{project.studio} · {role.name}</p>
          </div>
          <StageBadge stage={s.stage} size="md" />
        </div>

        <Timeline stage={s.stage} />

        <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px]">
          {deadline && (
            <span className={cn("inline-flex items-center gap-1", urgent ? "text-gold font-semibold" : "text-text-muted")}>
              <Clock className="w-3 h-3" />
              {needsTape
                ? daysToDeadline! < 0 ? "Deadline passed" : daysToDeadline === 0 ? "Due today" : `Due in ${daysToDeadline}d`
                : `Deadline ${deadline.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
            </span>
          )}
          {role.shootDates && <span className="text-text-muted">Shoot: {role.shootDates}</span>}
          {role.payRange && <span className="text-success font-semibold">{role.payRange}</span>}
        </div>

        {s.proMessage && <p className="text-xs text-text-muted leading-relaxed mt-3 line-clamp-2">{s.proMessage}</p>}
      </div>

      <div className="border-t border-border bg-bg/40 px-3 py-2.5">
        {needsTape || callbackTape ? (
          <Link
            href={`/inbox/${s.id}/record`}
            className={cn(
              "w-full h-10 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 active:scale-95 transition-transform",
              callbackTape ? "bg-success text-bg" : "bg-gold text-bg"
            )}
          >
            <Video className="w-4 h-4" />
            {callbackTape ? "Record callback tape" : "Record self-tape"}
          </Link>
        ) : (
          <div className="text-[11px] text-text-muted text-center px-2">
            {statusMessage(s.stage)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Timeline({ stage }: { stage: Submission["stage"] }) {
  const steps: { id: Submission["stage"]; label: string }[] = [
    { id: "invited",     label: "Invited" },
    { id: "submitted",   label: "Submitted" },
    { id: "callback",    label: "Callback" },
    { id: "avail_check", label: "Avail" },
    { id: "offered",     label: "Offer" },
    { id: "booked",      label: "Booked" },
  ];
  const order: Submission["stage"][] = ["invited", "submitted", "callback", "avail_check", "offered", "booked"];
  const currentIdx = stage === "rejected"
    ? -1
    : stage === "hold"
      ? order.indexOf("submitted")
      : order.indexOf(stage);

  if (stage === "rejected") {
    return (
      <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-text-muted">
        <AlertCircle className="w-3 h-3" /> Casting moved in a different direction
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-1">
      {steps.map((s, i) => {
        const reached = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
            <div className={cn(
              "h-1 w-full rounded-full transition-all",
              reached ? (isCurrent ? "bg-gold" : "bg-gold/60") : "bg-bg"
            )} />
            <div className={cn(
              "text-[8px] uppercase tracking-wider text-center",
              isCurrent ? "text-gold font-semibold" : reached ? "text-text" : "text-text-subtle"
            )}>
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function isActive(s: Submission) {
  return !["booked", "rejected"].includes(s.stage);
}
function urgencyScore(s: Submission, role?: Role) {
  if (s.stage !== "invited") return 999;
  if (!role?.deadline) return 100;
  return +new Date(role.deadline) - Date.now();
}
function statusMessage(stage: Submission["stage"]) {
  switch (stage) {
    case "submitted":   return "Your tape was received — awaiting decision.";
    case "hold":        return "Casting placed you on hold — they'll update you soon.";
    case "avail_check": return "Confirm your availability — production will follow up.";
    case "offered":     return "You have an offer — check your messages.";
    case "booked":      return "🎉 Booked. Production will be in touch.";
    case "rejected":    return "Casting passed on this role.";
    default:            return "";
  }
}
