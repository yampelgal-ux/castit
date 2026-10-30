"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FolderOpen, Plus, ArrowRight, Film, Tv, Megaphone, Clock, Zap, Sparkles, Search } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { loadProjects, projectOverview, addProject, updateProject, STAGE_META, type Project, type Stage } from "@/lib/projects-store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TYPES: Project["type"][] = ["Feature Film", "TV Series", "Commercial", "Short Film", "Theater", "Music Video"];
const COLORS = ["#8B5A3C", "#3C5A8B", "#5C7548", "#8B3C5A", "#3C8B7A", "#8B7A3C"];

type Filter = "all" | "attention" | "casting" | "callbacks" | "closed";
type Sort = "attention" | "recent" | "az";

const STAGE_ORDER: Stage[] = ["invited", "submitted", "callback", "hold", "avail_check", "offered", "booked"];
const STAGE_BAR: Record<Stage, string> = {
  invited: "bg-border-strong/25",
  submitted: "bg-hi",
  callback: "bg-text",
  hold: "bg-plum",
  avail_check: "bg-plum-light",
  offered: "bg-violet",
  booked: "bg-sage",
  rejected: "bg-transparent",
};

const STAGE_HE: Record<Stage, string> = {
  invited: "הוזמנו", submitted: "לצפייה", callback: "קולבק", hold: "Hold",
  avail_check: "בדיקת זמינות", offered: "הצעה נשלחה", booked: "לוהקו", rejected: "נדחו",
};

export default function ProjectsPage() {
  const { lang, dir } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("attention");

  useEffect(() => { setProjects(loadProjects()); }, []);
  function reload() { setProjects(loadProjects()); }

  const rows = useMemo(() => projects.map((p) => ({ p, o: projectOverview(p.id) })), [projects]);
  const totals = useMemo(() => rows.reduce((t, { p, o }) => p.status === "closed" ? t : ({
    toReview: t.toReview + o.toReview,
    callbacks: t.callbacks + o.callbacksThisWeek,
    awaiting: t.awaiting + o.awaitingTalent,
    open: t.open + o.openRoles,
  }), { toReview: 0, callbacks: 0, awaiting: 0, open: 0 }), [rows]);

  const shown = rows
    .filter(({ p, o }) => {
      if (q.trim() && !`${p.title} ${p.studio}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
      if (filter === "attention") return p.status !== "closed" && o.urgency > 0;
      if (filter === "all") return p.status !== "closed";
      return p.status === filter;
    })
    .sort((a, b) =>
      sort === "az" ? a.p.title.localeCompare(b.p.title)
      : sort === "recent" ? +new Date(b.p.createdAt) - +new Date(a.p.createdAt)
      : b.o.urgency - a.o.urgency || b.o.lastActivity - a.o.lastActivity);

  const closedCount = projects.filter((p) => p.status === "closed").length;
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: L("פעילים", "Active") },
    { id: "attention", label: L("דורש טיפול", "Needs attention") },
    { id: "casting", label: L("בליהוק", "Casting") },
    { id: "callbacks", label: L("בקולבקים", "Callbacks") },
    { id: "closed", label: L(`סגורים (${closedCount})`, `Closed (${closedCount})`) },
  ];

  return (
    <div className="min-h-dvh bg-bg pb-24" dir={dir}>
      <Header
        title={<span className="flex items-center gap-2"><FolderOpen className="w-4 h-4" aria-hidden /><span className="font-display text-lg">{L("פרויקטים", "Projects")}</span></span>}
        right={
          <button onClick={() => setShowNew(true)} aria-label={L("פרויקט חדש", "New project")} className="w-11 h-11 -me-2 grid place-items-center">
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-4 pt-3 space-y-4">
        {/* What needs the casting team right now, across all active projects */}
        <section aria-label={L("סיכום", "Summary")} className="grid grid-cols-2 gap-2">
          <SummaryTile href="/pro/triage" value={totals.toReview} label={L("טייפים לצפייה", "Tapes to review")} hot={totals.toReview > 0} />
          <SummaryTile href="/pro/calendar" value={totals.callbacks} label={L("קולבקים השבוע", "Callbacks this week")} />
          <SummaryTile value={totals.awaiting} label={L("מחכים לתשובת שחקן", "Awaiting talent reply")} />
          <SummaryTile value={totals.open} label={L("תפקידים פתוחים", "Open roles")} />
        </section>

        <div className="flex gap-2">
          <label htmlFor="proj-q" className="sr-only">{L("חיפוש פרויקט", "Search projects")}</label>
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-text-muted" aria-hidden />
            <input id="proj-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("חיפוש לפי שם או הפקה", "Search by title or production")}
              className="w-full h-11 ps-9 pe-3 rounded-lg bg-bg-elevated border border-border text-base" />
          </div>
          <label htmlFor="proj-sort" className="sr-only">{L("מיון", "Sort")}</label>
          <select id="proj-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-11 rounded-lg bg-bg-elevated border border-border px-2 text-sm">
            <option value="attention">{L("דחוף קודם", "Urgent first")}</option>
            <option value="recent">{L("חדש קודם", "Newest")}</option>
            <option value="az">{L("א-ב", "A–Z")}</option>
          </select>
        </div>

        <div role="radiogroup" aria-label={L("סינון", "Filter")} className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {filters.map((f) => (
            <button key={f.id} role="radio" aria-checked={filter === f.id} onClick={() => setFilter(f.id)}
              className={cn("shrink-0 h-9 px-3 rounded-full border-2 text-sm font-semibold", filter === f.id ? "bg-hi text-on-hi border-border-strong" : "border-border")}>
              {f.label}
            </button>
          ))}
        </div>

        {projects.length === 0 ? (
          <EmptyState icon={FolderOpen} tone="gold"
            title={L("עוד אין פרויקטים", "No projects yet")}
            description={L("צרו תיקייה ראשונה כדי לארגן אודישנים לפי פרויקט ותפקיד.", "Create your first casting folder to organize auditions by project and role.")}
            ctaLabel={L("פרויקט חדש", "Create project")} ctaOnClick={() => setShowNew(true)} />
        ) : shown.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">{L("אין פרויקטים שמתאימים לסינון.", "No projects match this filter.")}</p>
        ) : (
          <div className="space-y-3">
            {shown.map(({ p, o }, i) => <ProjectCard key={p.id} p={p} o={o} i={i} L={L} he={he} onChange={reload} />)}
          </div>
        )}
      </div>

      {showNew && <NewProjectSheet onClose={() => setShowNew(false)} onCreated={() => { reload(); setShowNew(false); }} />}
    </div>
  );
}

function SummaryTile({ value, label, href, hot }: { value: number; label: string; href?: string; hot?: boolean }) {
  const body = (
    <>
      <div className="font-display text-3xl tnum leading-none">{value}</div>
      <div className="text-xs font-semibold mt-1">{label}</div>
    </>
  );
  const cls = cn("sheet rounded-xl p-3 block", hot && "bg-hi");
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

function ProjectCard({ p, o, i, L, he, onChange }: {
  p: Project; o: ReturnType<typeof projectOverview>; i: number;
  L: (h: string, e: string) => string; he: boolean; onChange: () => void;
}) {
  const Icon = p.type === "Feature Film" || p.type === "Short Film" ? Film : p.type === "TV Series" ? Tv : Megaphone;
  const active = STAGE_ORDER.filter((st) => o.byStage[st] > 0);
  const totalActive = active.reduce((n, st) => n + o.byStage[st], 0);
  const due = o.nextDeadline ? new Date(o.nextDeadline) : null;
  const dueLabel = due ? due.toLocaleDateString(he ? "he-IL" : "en-US", { weekday: "short", day: "numeric", month: "short" }) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="sheet rounded-xl overflow-hidden">
      <Link href={`/pro/projects/${p.id}`} className="block p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-lg grid place-items-center shrink-0 text-white" style={{ background: p.posterColor }} aria-hidden>
            <Icon className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg leading-tight truncate">{p.title}</h3>
            <p className="text-xs text-text-muted truncate">{p.studio} · {p.type}{p.mode === "quick" ? " · Quick Cast" : ""}</p>
          </div>
          <StatusBadge status={p.status} L={L} />
        </div>

        {/* Pipeline bar: where every talent in this project currently stands */}
        {totalActive > 0 ? (
          <div>
            <div className="flex h-2.5 rounded-full overflow-hidden border border-border-strong" role="img"
              aria-label={active.map((st) => `${he ? STAGE_HE[st] : STAGE_META[st].label}: ${o.byStage[st]}`).join(", ")}>
              {active.map((st) => <span key={st} className={STAGE_BAR[st]} style={{ width: `${(o.byStage[st] / totalActive) * 100}%` }} />)}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-text-muted">
              {active.map((st) => (
                <span key={st} className="inline-flex items-center gap-1"><span className={cn("w-2 h-2 rounded-full border border-border-strong/40", STAGE_BAR[st])} />{he ? STAGE_HE[st] : STAGE_META[st].label} {o.byStage[st]}</span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-muted">{L("עוד לא הוזמנו שחקנים.", "No talent invited yet.")}</p>
        )}

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {o.toReview > 0 && <span className="px-2 py-1 rounded-md bg-hi text-on-hi">{L(`${o.toReview} לצפייה`, `${o.toReview} to review`)}</span>}
          {o.callbacksThisWeek > 0 && <span className="px-2 py-1 rounded-md bg-text text-bg">{L(`${o.callbacksThisWeek} קולבקים השבוע`, `${o.callbacksThisWeek} callbacks this week`)}</span>}
          {o.awaitingTalent > 0 && <span className="px-2 py-1 rounded-md border border-border">{L(`${o.awaitingTalent} מחכים לתשובה`, `${o.awaitingTalent} awaiting reply`)}</span>}
          {dueLabel && <span className="px-2 py-1 rounded-md border border-border inline-flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden />{L(`טייפים עד ${dueLabel}`, `Tapes due ${dueLabel}`)}</span>}
          <span className="px-2 py-1 rounded-md border border-border">{L(`${o.roles} תפקידים · ${o.openRoles} פתוחים`, `${o.roles} roles · ${o.openRoles} open`)}</span>
        </div>
      </Link>
      <div className="flex border-t border-border text-sm font-semibold">
        <Link href={`/pro/projects/${p.id}`} className="flex-1 h-11 grid place-items-center">{L("פתיחה", "Open")}</Link>
        <button
          onClick={() => { updateProject(p.id, { status: p.status === "closed" ? "casting" : "closed" }); onChange(); }}
          className="flex-1 h-11 grid place-items-center border-s border-border text-text-muted">
          {p.status === "closed" ? L("פתיחה מחדש", "Reopen") : L("סגירת פרויקט", "Close project")}
        </button>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status, L }: { status: Project["status"]; L: (h: string, e: string) => string }) {
  const map = {
    casting:   { label: L("בליהוק", "Casting"),   cls: "bg-hi text-on-hi border-border-strong" },
    callbacks: { label: L("קולבקים", "Callbacks"), cls: "bg-text text-bg border-border-strong" },
    closed:    { label: L("סגור", "Closed"),     cls: "bg-bg-muted text-text-muted border-border" },
  };
  const s = map[status];
  return <span className={cn("text-xs px-2 py-0.5 rounded-md border font-bold whitespace-nowrap", s.cls)}>{s.label}</span>;
}

function NewProjectSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t, lang } = useT();
  const L = (h: string, e: string) => (lang === "he" ? h : e);
  const [title, setTitle] = useState("");
  const [studio, setStudio] = useState("");
  const [type, setType] = useState<Project["type"]>("Feature Film");
  const [color, setColor] = useState(COLORS[0]);
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"full" | "quick">("full");

  function submit() {
    if (!title.trim()) return;
    addProject({
      title: title.trim(),
      studio: studio.trim() || "Independent",
      type,
      status: "casting",
      posterColor: color,
      description: description.trim() || undefined,
      mode,
    });
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5 max-h-[85dvh] overflow-y-auto"
      >
        <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />
        <h2 className="font-display text-2xl mb-4">{L("פרויקט חדש", "New project")}</h2>

        <div className="space-y-3">
          <Field label={L("שם הפרויקט", "Title")} value={title} onChange={setTitle} placeholder={L("למשל: אחרי הגשם", "e.g. After the Rain")} />
          <Field label={L("הפקה / סטודיו", "Studio / Production")} value={studio} onChange={setStudio} placeholder={L("למשל: הפקות צפון", "e.g. Northwind Pictures")} />

          {/* Mode selector — full vs quick cast */}
          <div>
            <Label>{L("סוג ליהוק", "Casting mode")}</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setMode("full")}
                className={cn(
                  "p-3 rounded-2xl border text-right transition",
                  mode === "full"
                    ? "bg-gold/10 border-gold"
                    : "bg-bg border-border"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  <span className="text-xs font-semibold">{L("ליהוק מלא", "Full Casting")}</span>
                </div>
                <p className="text-[0.6875rem] text-text-muted leading-snug">
                  {t("proj.fullDesc")}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("quick")}
                className={cn(
                  "p-3 rounded-2xl border text-right transition",
                  mode === "quick"
                    ? "bg-plum/10 border-plum"
                    : "bg-bg border-border"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-plum-light" />
                  <span className="text-xs font-semibold">{L("ליהוק מהיר", "Quick Cast")}</span>
                </div>
                <p className="text-[0.6875rem] text-text-muted leading-snug">
                  {t("proj.quickDesc")}
                </p>
              </button>
            </div>
          </div>

          <div>
            <Label>{L("סוג", "Type")}</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "px-3 h-9 rounded-full border text-xs font-medium",
                    type === t ? "bg-gold text-on-accent border-gold" : "bg-bg text-text border-border"
                  )}
                >{t}</button>
              ))}
            </div>
          </div>

          <div>
            <Label>{L("צבע תיקייה", "Folder color")}</Label>
            <div className="flex gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`${L("צבע", "Color")} ${c}`}
                  aria-pressed={color === c}
                  className={cn(
                    "w-9 h-9 rounded-full border-2 transition-transform",
                    color === c ? "border-gold scale-110" : "border-transparent"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>{L("תיאור (לא חובה)", "Description (optional)")}</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full mt-1 px-3 py-2 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
              placeholder={L("לוגליין או הערות…", "Logline or notes…")}
            />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!title.trim()}
          className={cn(
            "mt-5 w-full h-12 rounded-2xl font-semibold flex items-center justify-center gap-2",
            title.trim() ? "bg-gold text-on-accent" : "bg-bg text-text-subtle"
          )}
        >
          {L("יצירת פרויקט", "Create project")} <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[0.6875rem] uppercase tracking-widest text-text-muted">{children}</div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 h-11 px-3 rounded-2xl bg-bg border border-border text-base focus:border-gold/60"
      />
    </label>
  );
}
