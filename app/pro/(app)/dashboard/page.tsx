"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search, FolderOpen, PlayCircle, Bell, Users, ArrowRight,
  Clock, CheckCircle2, XCircle, Send, Plus, Wand2, Calendar, TrendingUp,
  Inbox, Zap, AlertTriangle, ClipboardCheck, BarChart3,
} from "lucide-react";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import {
  loadProjects, loadSubmissions, loadRoles, loadInbox,
  type Project, type Submission, type InboxItem,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";

export default function ProDashboardPage() {
  const { profile } = useStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);

  useEffect(() => {
    setProjects(loadProjects());
    setSubmissions(loadSubmissions());
    setInbox(loadInbox());
  }, []);

  const inboxCounts = useMemo(() => {
    const urgent = inbox.filter((i) =>
      i.reason === "hold_expired" ||
      i.reason === "deadline_passed" ||
      i.reason === "hold_expiring" ||
      i.reason === "deadline_today"
    ).length;
    const toReview = inbox.filter((i) => i.reason === "to_review").length;
    return { total: inbox.length, urgent, toReview };
  }, [inbox]);

  const stats = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status !== "closed").length;
    return {
      projects: activeProjects,
      toReview: submissions.filter((s) => s.stage === "submitted").length,
      invited: submissions.filter((s) => s.stage === "invited").length,
      callbacks: submissions.filter((s) => s.stage === "callback").length,
      booked: submissions.filter((s) => s.stage === "booked").length,
    };
  }, [projects, submissions]);

  const todo = submissions
    .filter((s) => s.stage === "submitted")
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 4);

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header
        title={
          <span className="flex items-center gap-2">
            <span className="font-display text-lg">Studio</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-plum/20 text-plum-light font-semibold tracking-wider">PRO</span>
          </span>
        }
        right={
          <Link href="/notifications" className="p-2 -mr-2 text-text-muted">
            <Bell className="w-5 h-5" />
          </Link>
        }
      />

      <div className="px-5 pt-3 space-y-5">
        {/* Greeting */}
        <div>
          <h1 className="font-display text-3xl tracking-editorial">
            Good to see you, <em className="text-gold-gradient not-italic">{profile.name?.split(" ")[0] || "there"}</em>.
          </h1>
          <p className="text-text-muted text-sm mt-1">Your casting workspace.</p>
        </div>

        {/* Action Inbox CTA — when there's work to do */}
        {inboxCounts.total > 0 && (
          <Link
            href="/pro/inbox"
            className={cn(
              "block rounded-2xl p-4 border relative overflow-hidden",
              inboxCounts.urgent > 0
                ? "bg-gradient-to-br from-danger/10 via-bg-elevated to-bg-elevated border-danger/40"
                : "bg-gradient-to-br from-gold/10 via-bg-elevated to-bg-elevated border-gold/30"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-11 h-11 rounded-xl grid place-items-center shrink-0",
                inboxCounts.urgent > 0 ? "bg-danger/20 text-danger" : "bg-gold/20 text-gold"
              )}>
                {inboxCounts.urgent > 0 ? <AlertTriangle className="w-5 h-5" /> : <Inbox className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "text-[10px] uppercase tracking-widest font-semibold",
                  inboxCounts.urgent > 0 ? "text-danger" : "text-gold"
                )}>
                  Action Inbox
                </div>
                <div className="text-sm font-semibold mt-0.5">
                  {inboxCounts.urgent > 0 ? (
                    <><span className="tnum">{inboxCounts.urgent}</span> פעולות דחופות</>
                  ) : (
                    <><span className="tnum">{inboxCounts.total}</span> פריטים ממתינים</>
                  )}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {inboxCounts.toReview > 0 && `${inboxCounts.toReview} טייפים לסקירה · `}
                  הקש לפתיחה
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted shrink-0" />
            </div>
          </Link>
        )}

        {/* Triage CTA — when ≥3 tapes to review */}
        {inboxCounts.toReview >= 3 && (
          <Link
            href="/pro/triage"
            className="block rounded-2xl p-3 bg-bg-elevated border border-gold/30 hover:border-gold/50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gold/15 text-gold grid place-items-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Tape Triage Mode</div>
                <div className="text-[10px] text-text-muted">החלק ימינה/שמאלה כדי לעבור מהר על {inboxCounts.toReview} טייפים</div>
              </div>
              <span className="text-[10px] font-bold text-gold tnum">{inboxCounts.toReview}</span>
            </div>
          </Link>
        )}

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <KPI
            icon={FolderOpen} label="Active projects" value={stats.projects}
            tone="gold" href="/pro/projects"
          />
          <KPI
            icon={Clock} label="Tapes to review" value={stats.toReview}
            tone="plum" href="/pro/inbox" urgent={stats.toReview > 0}
          />
          <KPI
            icon={Send} label="Open invites" value={stats.invited}
            tone="sage" href="/pro/projects"
          />
          <KPI
            icon={CheckCircle2} label="Booked" value={stats.booked}
            tone="success" href="/pro/projects"
          />
        </div>

        {/* Quick actions row */}
        <div className="grid grid-cols-4 gap-2">
          <QuickAction icon={Search} label="Find" tone="gold" href="/pro/search" />
          <QuickAction icon={ClipboardCheck} label="Reviews" tone="sage" href="/pro/approvals" />
          <QuickAction icon={BarChart3} label="Analytics" tone="plum" href="/pro/analytics" />
          <QuickAction icon={Bell} label="Inbox" tone="violet" href="/notifications" />
        </div>

        {/* Projects hero */}
        <Link
          href="/pro/projects"
          className="block rounded-3xl p-5 bg-gradient-to-br from-gold/15 via-bg-elevated to-bg-elevated border border-gold/30 relative overflow-hidden"
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gold/15 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gold/20 grid place-items-center shrink-0">
              <FolderOpen className="w-7 h-7 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">Workspace</div>
              <div className="font-display text-xl leading-tight mt-0.5">Projects & Auditions</div>
              <div className="text-[11px] text-text-muted mt-0.5">
                Organize tapes by project and role — decide callbacks.
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gold shrink-0" />
          </div>
        </Link>

        {/* To review */}
        {todo.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="text-xs uppercase tracking-widest text-text-muted">
                Awaiting your call <span className="text-text font-semibold tnum">({stats.toReview})</span>
              </h2>
              <Link href="/pro/projects" className="text-[11px] text-gold font-semibold">See all →</Link>
            </div>
            <div className="space-y-2">
              {todo.map((s, i) => <PendingRow key={s.id} s={s} i={i} />)}
            </div>
          </section>
        )}

        {/* Empty state */}
        {projects.length === 0 && (
          <section className="rounded-2xl border border-border bg-bg-elevated p-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 text-gold grid place-items-center mx-auto mb-3">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="font-display text-lg">Start your first project</h3>
            <p className="text-xs text-text-muted max-w-[280px] mx-auto mt-1">
              Create a casting folder, add roles, then send audition invites to talents you find via search or reels.
            </p>
            <Link
              href="/pro/projects"
              className="inline-flex items-center gap-2 mt-4 px-5 h-11 rounded-full bg-gold text-bg text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Create project
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

function KPI({
  icon: Icon, label, value, tone, href, urgent,
}: { icon: any; label: string; value: number; tone: "gold" | "plum" | "sage" | "success"; href: string; urgent?: boolean }) {
  const color = {
    gold:    { bg: "bg-gold/12",    fg: "text-gold" },
    plum:    { bg: "bg-plum/20",    fg: "text-plum-light" },
    sage:    { bg: "bg-sage/15",    fg: "text-sage" },
    success: { bg: "bg-success/15", fg: "text-success" },
  }[tone];
  return (
    <Link href={href} className="rounded-2xl bg-bg-elevated border border-border p-4 relative">
      <div className={cn("w-9 h-9 rounded-xl grid place-items-center mb-2", color.bg)}>
        <Icon className={cn("w-4 h-4", color.fg)} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-2xl tnum">{value}</span>
        {urgent && value > 0 && <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />}
      </div>
      <div className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">{label}</div>
    </Link>
  );
}

function QuickAction({ icon: Icon, label, tone, href }: { icon: any; label: string; tone: "gold" | "violet" | "plum" | "sage"; href: string }) {
  const color = {
    sage:   "bg-sage/15 text-sage border-sage/30",
    gold:   "bg-gold/10 text-gold border-gold/30",
    violet: "bg-violet/15 text-violet border-violet/30",
    plum:   "bg-plum/15 text-plum-light border-plum-light/30",
  }[tone];
  return (
    <Link
      href={href}
      className={cn("flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border", color)}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </Link>
  );
}

function PendingRow({ s, i }: { s: Submission; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
    >
      <Link
        href={`/pro/projects`}
        className="flex items-center gap-3 p-2.5 rounded-2xl bg-bg-elevated border border-border hover:border-gold/40"
      >
        <img src={s.talentPhoto} alt={s.talentName} className="w-10 h-10 rounded-xl object-cover" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{s.talentName}</div>
          <div className="text-[10px] text-text-muted">{timeAgo(s.createdAt)}</div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-semibold uppercase tracking-wider">
          Review
        </span>
      </Link>
    </motion.div>
  );
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms / 3600000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return "just now";
}
