"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FolderOpen, Plus, ArrowRight, Film, Tv, Megaphone, Users, CheckCircle2, Clock, Zap, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { loadProjects, projectCounts, addProject, type Project } from "@/lib/projects-store";
import { cn } from "@/lib/utils";

const TYPES: Project["type"][] = ["Feature Film", "TV Series", "Commercial", "Short Film", "Theater", "Music Video"];
const COLORS = ["#8B5A3C", "#3C5A8B", "#5C7548", "#8B3C5A", "#3C8B7A", "#8B7A3C"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { setProjects(loadProjects()); }, []);

  function reload() { setProjects(loadProjects()); }

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header
        title={
          <span className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-gold" />
            <span className="font-display text-lg">Projects</span>
          </span>
        }
        right={
          <button onClick={() => setShowNew(true)} className="text-gold p-2 -mr-2">
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-5 pt-3 space-y-4">
        <div>
          <h1 className="font-display text-3xl tracking-editorial">
            Your <em className="text-gold-gradient not-italic">casting folders</em>.
          </h1>
          <p className="text-text-muted text-sm mt-1">Auditions organized by project and role.</p>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            tone="gold"
            title="No projects yet"
            description="Create your first casting folder to start organizing auditions by project and role."
            ctaLabel="Create project"
            ctaOnClick={() => setShowNew(true)}
          />
        ) : (
          <div className="space-y-3">
            {projects.map((p, i) => <ProjectCard key={p.id} p={p} i={i} />)}
          </div>
        )}
      </div>

      {showNew && (
        <NewProjectSheet
          onClose={() => setShowNew(false)}
          onCreated={() => { reload(); setShowNew(false); }}
        />
      )}
    </div>
  );
}

function ProjectCard({ p, i }: { p: Project; i: number }) {
  const counts = projectCounts(p.id);
  const Icon = p.type === "Feature Film" || p.type === "Short Film" ? Film
             : p.type === "TV Series" ? Tv
             : Megaphone;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
    >
      <Link
        href={`/pro/projects/${p.id}`}
        className="block rounded-2xl bg-bg-elevated border border-border hover:border-border-strong overflow-hidden"
      >
        <div
          className="h-20 relative flex items-end p-3"
          style={{ background: `linear-gradient(135deg, ${p.posterColor}cc, ${p.posterColor}55)` }}
        >
          <Icon className="absolute top-3 right-3 w-5 h-5 text-white/60" />
          <span className="text-[10px] uppercase tracking-widest text-white/80 font-semibold">
            {p.type}
          </span>
          {p.mode === "quick" && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-plum/30 text-white font-bold uppercase tracking-wider">
              <Zap className="w-2.5 h-2.5" /> Quick
            </span>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg leading-tight truncate">{p.title}</h3>
              <p className="text-[11px] text-text-muted truncate">{p.studio}</p>
            </div>
            <StatusBadge status={p.status} />
          </div>

          <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-border">
            <Stat label="Roles" value={counts.roles} />
            <Stat label="To review" value={counts.toReview} tone="gold" />
            <Stat label="Callbacks" value={counts.callbacks} tone="success" />
            <Stat label="Booked" value={counts.booked} tone="success" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "gold" | "success" }) {
  return (
    <div className="text-center">
      <div className={cn(
        "font-display text-base tnum",
        tone === "gold" ? "text-gold" : tone === "success" ? "text-success" : "text-text"
      )}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-text-muted">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Project["status"] }) {
  const map = {
    casting:   { label: "Casting",   cls: "bg-gold/15 text-gold border-gold/30" },
    callbacks: { label: "Callbacks", cls: "bg-plum/20 text-plum-light border-plum-light/30" },
    closed:    { label: "Closed",    cls: "bg-bg text-text-muted border-border" },
  };
  const s = map[status];
  return (
    <span className={cn("text-[9px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider whitespace-nowrap", s.cls)}>
      {s.label}
    </span>
  );
}

function NewProjectSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
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
        <h2 className="font-display text-2xl mb-4">New project</h2>

        <div className="space-y-3">
          <Field label="Title" value={title} onChange={setTitle} placeholder="e.g. After the Rain" />
          <Field label="Studio / Production" value={studio} onChange={setStudio} placeholder="e.g. Northwind Pictures" />

          {/* Mode selector — full vs quick cast */}
          <div>
            <Label>Casting mode</Label>
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
                  <span className="text-xs font-semibold">Full Casting</span>
                </div>
                <p className="text-[10px] text-text-muted leading-snug">
                  Pipeline מלא 8 שלבים. לידים, סופורט, יומיים — עם callback/hold/avail/offer.
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
                  <span className="text-xs font-semibold">Quick Cast</span>
                </div>
                <p className="text-[10px] text-text-muted leading-snug">
                  3 שלבים בלבד. לניצבים, דוגמנים, פרסומות — Select/Pass.
                </p>
              </button>
            </div>
          </div>

          <div>
            <Label>Type</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "px-3 h-9 rounded-full border text-xs font-medium",
                    type === t ? "bg-gold text-bg border-gold" : "bg-bg text-text border-border"
                  )}
                >{t}</button>
              ))}
            </div>
          </div>

          <div>
            <Label>Folder color</Label>
            <div className="flex gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
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
            <Label>Description (optional)</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full mt-1 px-3 py-2 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
              placeholder="Logline or notes…"
            />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!title.trim()}
          className={cn(
            "mt-5 w-full h-12 rounded-2xl font-semibold flex items-center justify-center gap-2",
            title.trim() ? "bg-gold text-bg" : "bg-bg text-text-subtle"
          )}
        >
          Create project <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-widest text-text-muted">{children}</div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
      />
    </div>
  );
}
