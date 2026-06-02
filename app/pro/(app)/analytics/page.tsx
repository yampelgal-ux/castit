"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Clock, Award, Sparkles, Target,
  Users, FileVideo, Zap, BarChart3,
} from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import {
  loadProjects, loadRoles, loadSubmissions,
  type Project, type Submission, type Stage, STAGE_META,
} from "@/lib/projects-store";
import { loadApprovalSessions, type ApprovalSession } from "@/lib/approval-store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Stages in pipeline order (excluding "rejected")
const PIPELINE_STAGES: Stage[] = ["invited", "submitted", "callback", "hold", "avail_check", "offered", "booked"];

export default function ProAnalyticsPage() {
  const { t, dir } = useT();
  const [loaded, setLoaded] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [sessions, setSessions] = useState<ApprovalSession[]>([]);

  useEffect(() => {
    setProjects(loadProjects());
    setSubs(loadSubmissions());
    setSessions(loadApprovalSessions());
    setLoaded(true);
  }, []);

  // ─── Aggregate stats ─────────────────────────────────
  const stats = useMemo(() => {
    if (subs.length === 0) {
      return {
        totalSubs: 0,
        booked: 0,
        callbacks: 0,
        rejected: 0,
        active: 0,
        bookRate: 0,
        callbackRate: 0,
        avgTimeToDecision: 0,
        tapesReviewed: 0,
        stageBreakdown: {} as Record<Stage, number>,
        topProjects: [] as { project: Project; total: number; booked: number }[],
        aiSaved: 0,
      };
    }

    const stageBreakdown: Record<string, number> = {};
    for (const s of subs) {
      stageBreakdown[s.stage] = (stageBreakdown[s.stage] ?? 0) + 1;
    }
    const booked = stageBreakdown["booked"] ?? 0;
    const rejected = stageBreakdown["rejected"] ?? 0;
    const callbacks = (stageBreakdown["callback"] ?? 0)
                    + (stageBreakdown["hold"] ?? 0)
                    + (stageBreakdown["avail_check"] ?? 0)
                    + (stageBreakdown["offered"] ?? 0)
                    + booked;
    const reviewedTotal = subs.filter((s) => s.tapes.length > 0).length;
    const active = subs.length - booked - rejected;

    // Average days between createdAt and last activity for booked/rejected
    const decided = subs.filter((s) => s.stage === "booked" || s.stage === "rejected");
    const avgTimeToDecision = decided.length === 0 ? 0 : Math.round(
      decided.reduce((acc, s) => {
        const last = s.tapes[s.tapes.length - 1]?.submittedAt ?? s.createdAt;
        return acc + Math.max(0, (+new Date(last) - +new Date(s.createdAt)) / 86_400_000);
      }, 0) / decided.length * 10
    ) / 10;

    // Top 3 projects by submission volume
    const byProject: Record<string, { total: number; booked: number }> = {};
    for (const s of subs) {
      const r = loadRoles().find((x) => x.id === s.roleId);
      if (!r) continue;
      const pid = r.projectId;
      byProject[pid] ||= { total: 0, booked: 0 };
      byProject[pid].total++;
      if (s.stage === "booked") byProject[pid].booked++;
    }
    const topProjects = Object.entries(byProject)
      .map(([pid, v]) => ({ project: projects.find((p) => p.id === pid)!, ...v }))
      .filter((x) => x.project)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    // AI time saved heuristic:
    // - Each Aria tape analysis: ~3 min saved per tape (no need to scrub)
    // - Each Bulk Role created: ~2 min saved (no manual data entry)
    // - Each AI-drafted message: ~1.5 min saved
    // - Each tape Triage decision (quick action): ~30 sec saved
    const tapesWithAnalysis = subs.reduce(
      (n, s) => n + s.tapes.filter((t) => t.ariaAnalysis).length, 0
    );
    const aiSavedMin = tapesWithAnalysis * 3 + projects.length * 4 + subs.length * 1;
    const aiSaved = Math.round(aiSavedMin / 60 * 10) / 10; // hours

    return {
      totalSubs: subs.length,
      booked,
      callbacks,
      rejected,
      active,
      bookRate: subs.length > 0 ? Math.round(booked / subs.length * 100) : 0,
      callbackRate: subs.length > 0 ? Math.round(callbacks / subs.length * 100) : 0,
      avgTimeToDecision,
      tapesReviewed: reviewedTotal,
      stageBreakdown: stageBreakdown as Record<Stage, number>,
      topProjects,
      aiSaved,
    };
  }, [subs, projects]);

  // Director vote stats
  const voteStats = useMemo(() => {
    let yes = 0, no = 0, maybe = 0, total = 0;
    for (const s of sessions) {
      for (const t of s.talents) {
        if (t.vote === "yes") yes++;
        else if (t.vote === "no") no++;
        else if (t.vote === "maybe") maybe++;
        if (t.vote) total++;
      }
    }
    return { yes, no, maybe, total };
  }, [sessions]);

  if (loaded && subs.length === 0) {
    return (
      <div className="min-h-dvh bg-bg" dir={dir}>
        <Header back title={t("an.title")} />
        <EmptyState
          icon={BarChart3}
          tone="gold"
          title={t("an.empty")}
          description={t("an.emptyDesc")}
          ctaLabel={t("nav.projects")}
          ctaHref="/pro/projects"
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header back title={
        <span className="inline-flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gold" />
          <span className="font-display text-lg">{t("an.title")}</span>
        </span>
      } />

      <div className="px-4 pt-3 space-y-4" dir={dir}>
        {/* Hero band — the three numbers an investor reads in 2 seconds */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 bg-gradient-to-br from-gold/15 via-bg-elevated to-plum/10 border border-gold/30 relative overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-widest text-gold font-semibold mb-3">
              {t("an.thisSeason")}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="font-display text-4xl font-bold text-gold tnum leading-none">{stats.callbackRate}%</div>
                <div className="text-[10px] text-text-muted mt-1.5 leading-tight">{t("an.heroBookRate")}</div>
              </div>
              <div>
                <div className="font-display text-4xl font-bold text-text tnum leading-none">{stats.totalSubs}</div>
                <div className="text-[10px] text-text-muted mt-1.5 leading-tight">{t("an.heroSubs")}</div>
              </div>
              <div>
                <div className="font-display text-4xl font-bold text-plum-light tnum leading-none">{stats.aiSaved}</div>
                <div className="text-[10px] text-text-muted mt-1.5 leading-tight">{t("an.heroHours")}</div>
              </div>
            </div>
            <div className="text-[11px] text-text-muted mt-4 pt-3 border-t border-gold/15 leading-relaxed flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
              <span><span className="text-gold font-semibold">{t("an.ariaImpact")}:</span> {t("an.ariaEstimate", { n: stats.tapesReviewed })}</span>
            </div>
          </div>
        </motion.div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 gap-2">
          <Kpi icon={FileVideo} label={t("an.kpi.reviewed")} value={stats.tapesReviewed} tone="plum" />
          <Kpi icon={Sparkles} label={t("an.kpi.callbacks")} value={stats.callbacks} tone="sage" />
          <Kpi icon={Award} label={t("an.kpi.booked")} value={stats.booked} tone="success" />
          <Kpi icon={Users} label={t("an.kpi.subs")} value={stats.totalSubs} tone="gold" />
        </div>

        {/* Conversion funnel */}
        <Card title={t("an.funnel")} subtitle={t("an.funnelSub")}>
          <div className="space-y-2">
            {PIPELINE_STAGES.map((stage) => {
              const count = stats.stageBreakdown[stage] ?? 0;
              const pct = stats.totalSubs > 0 ? (count / stats.totalSubs) * 100 : 0;
              return (
                <div key={stage}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-text">{STAGE_META[stage].label}</span>
                    <span className="text-text-muted tnum">{count} · {Math.round(pct)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-bg overflow-hidden">
                    <div
                      className="h-full bg-gold transition-all"
                      style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-text-muted">{t("an.bookRate")}</div>
              <div className="font-display text-xl text-success">{stats.bookRate}%</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-text-muted">{t("an.callbackRate")}</div>
              <div className="font-display text-xl text-gold">{stats.callbackRate}%</div>
            </div>
          </div>
        </Card>

        {/* Time to decision */}
        <Card title={t("an.ttd")}>
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-plum-light" />
            <div>
              <div className="font-display text-3xl text-text">
                {stats.avgTimeToDecision} <span className="text-base text-text-muted">{t("an.days")}</span>
              </div>
              <div className="text-[11px] text-text-muted">{t("an.ttdSub")}</div>
            </div>
          </div>
        </Card>

        {/* Top projects */}
        {stats.topProjects.length > 0 && (
          <Card title={t("an.topProjects")}>
            <div className="space-y-2">
              {stats.topProjects.map((p) => (
                <div key={p.project.id} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg shrink-0"
                    style={{ background: `linear-gradient(135deg, ${p.project.posterColor}cc, ${p.project.posterColor}55)` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.project.title}</div>
                    <div className="text-[10px] text-text-muted">
                      {t("an.subsBooked", { a: p.total, b: p.booked })}
                    </div>
                  </div>
                  <div className="font-display text-lg text-gold tnum">
                    {p.total > 0 ? Math.round(p.booked / p.total * 100) : 0}%
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Director vote breakdown */}
        {voteStats.total > 0 && (
          <Card title={t("an.directorVotes")} subtitle={t("an.votesCount", { n: voteStats.total })}>
            <div className="grid grid-cols-3 gap-2">
              <VoteStat label={`👍 ${t("an.yes")}`} value={voteStats.yes} tone="success" />
              <VoteStat label={`🤔 ${t("an.maybe")}`} value={voteStats.maybe} tone="gold" />
              <VoteStat label={`👎 ${t("an.no")}`} value={voteStats.no} tone="danger" />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: "gold" | "plum" | "sage" | "success" }) {
  const toneCls =
    tone === "gold" ? "text-gold"
    : tone === "plum" ? "text-plum-light"
    : tone === "sage" ? "text-sage"
    : "text-success";
  return (
    <div className="rounded-2xl bg-bg-elevated border border-border p-3">
      <div className="flex items-center justify-between">
        <Icon className={cn("w-4 h-4", toneCls)} />
      </div>
      <div className={cn("font-display text-2xl font-bold mt-1 tnum", toneCls)}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-text-muted">{label}</div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-bg-elevated border border-border p-4">
      <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">{title}</div>
      {subtitle && <div className="text-[11px] text-text-muted mb-3">{subtitle}</div>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

function VoteStat({ label, value, tone }: { label: string; value: number; tone: "success" | "gold" | "danger" }) {
  const cls = tone === "success" ? "text-success" : tone === "gold" ? "text-gold" : "text-danger";
  return (
    <div className="text-center rounded-xl bg-bg p-3 border border-border">
      <div className={cn("font-display text-2xl font-bold tnum", cls)}>{value}</div>
      <div className="text-[10px] text-text-muted mt-0.5">{label}</div>
    </div>
  );
}
