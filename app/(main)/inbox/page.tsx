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
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Demo-mode: in localStorage there's no real "me" talent matching pro invites.
// So when ME_ID has no auditions, we surface ALL submissions across the device
// so the talent can preview the inbox UX from the demo data.
const ME_ID = "me";

type AuditionItem = { submission: Submission; role?: Role; project?: Project };
type TabId = "active" | "history";

export default function InboxPage() {
  const { t } = useT();
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
            <span className="font-display text-lg">{t("inbox.headerTitle")}</span>
          </span>
        }
      />

      <div className="px-5 pt-4 space-y-5">
        <div>
          <h1 className="font-display text-3xl tracking-editorial leading-tight">
            <span className="text-gold-gradient">{t("inbox.titleA")}</span> {t("inbox.titleB")}
          </h1>
          <p className="text-text-muted text-sm mt-1.5">
            {t("inbox.sub")}
          </p>
        </div>

        {counts.needTape > 0 && tab === "active" && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gold/10 border border-gold/30">
            <div className="w-8 h-8 rounded-lg bg-gold/20 text-gold grid place-items-center">
              <Video className="w-4 h-4" />
            </div>
            <div className="flex-1 text-sm">
              <span className="font-semibold text-gold">
                {counts.needTape === 1 ? t("inbox.tapeToRecord") : t("inbox.tapesToRecord", { n: counts.needTape })}
              </span>
              <span className="text-text-muted ml-1">{t("inbox.tapStart")}</span>
            </div>
          </div>
        )}

        <div className="flex gap-1 border-b border-border">
          {([
            { id: "active",  label: t("inbox.tab.active"),  count: counts.active },
            { id: "history", label: t("inbox.tab.history"), count: counts.history },
          ] as { id: TabId; label: string; count: number }[]).map((tab2) => (
            <button
              key={tab2.id}
              onClick={() => setTab(tab2.id)}
              className={cn(
                "flex-1 h-10 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-px transition-colors inline-flex items-center justify-center gap-2",
                tab === tab2.id ? "border-gold text-gold" : "border-transparent text-text-muted"
              )}
            >
              {tab2.label}
              <span className="tnum opacity-70">{tab2.count}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={tab === "active" ? t("inbox.empty.activeTitle") : t("inbox.empty.historyTitle")}
            description={tab === "active" ? t("inbox.empty.activeDesc") : t("inbox.empty.historyDesc")}
          />
        ) : (
          <div className="space-y-3">
            {shown.map((i, idx) => <AuditionCard key={i.submission.id} item={i} i={idx} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function AuditionCard({ item, i }: { item: AuditionItem; i: number }) {
  const { t } = useT();
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
            <div className="text-[10px] uppercase tracking-widest text-gold">{t(`value.type.${project.type}`)}</div>
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
                ? daysToDeadline! < 0
                    ? t("inbox.deadlinePassed")
                    : daysToDeadline === 0
                      ? t("inbox.dueToday")
                      : t("inbox.dueIn", { n: daysToDeadline! })
                : t("inbox.deadline", { date: deadline.toLocaleDateString(undefined, { month: "short", day: "numeric" }) })}
            </span>
          )}
          {role.shootDates && <span className="text-text-muted">{t("inbox.shoot")} {role.shootDates}</span>}
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
            {callbackTape ? t("inbox.recordCallback") : t("inbox.recordSelfTape")}
          </Link>
        ) : (
          <div className="text-[11px] text-text-muted text-center px-2">
            {statusMessage(s.stage, t)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Timeline({ stage }: { stage: Submission["stage"] }) {
  const { t } = useT();
  const steps: { id: Submission["stage"]; label: string }[] = [
    { id: "invited",     label: t("stage.invited") },
    { id: "submitted",   label: t("stage.submitted") },
    { id: "callback",    label: t("stage.callback") },
    { id: "avail_check", label: t("stage.avail") },
    { id: "offered",     label: t("stage.offer") },
    { id: "booked",      label: t("stage.booked") },
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
        <AlertCircle className="w-3 h-3" /> {t("inbox.rejected")}
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
function statusMessage(stage: Submission["stage"], t: (k: string) => string) {
  switch (stage) {
    case "submitted":   return t("inbox.status.submitted");
    case "hold":        return t("inbox.status.hold");
    case "avail_check": return t("inbox.status.avail_check");
    case "offered":     return t("inbox.status.offered");
    case "booked":      return t("inbox.status.booked");
    case "rejected":    return t("inbox.status.rejected");
    default:            return "";
  }
}
