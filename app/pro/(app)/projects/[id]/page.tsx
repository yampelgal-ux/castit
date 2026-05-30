"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, ArrowRight, Users, FileVideo, Trash2, ChevronRight, Heart, Wand2, Zap, CheckCircle2, XCircle, Paperclip } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { ProjectInsights } from "@/components/ProjectInsights";
import { ProjectTeam } from "@/components/ProjectTeam";
import { BulkRolesSheet } from "@/components/BulkRolesSheet";
import { SidesFileInput } from "@/components/SidesFileInput";
import type { RoleSidesFile } from "@/lib/projects-store";
import {
  getProject, getRolesByProject, addRole, deleteRole, roleCounts, deleteProject,
  type Project, type Role,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  function reload() {
    setProject(getProject(id) ?? null);
    setRoles(getRolesByProject(id));
  }

  useEffect(() => { reload(); }, [id]);

  if (!project) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="Project" />
        <EmptyState icon={Users} title="Not found" description="This project may have been removed." />
      </div>
    );
  }

  function removeRole(roleId: string) {
    if (!confirm("Delete this role and all its submissions?")) return;
    deleteRole(roleId);
    reload();
  }

  function removeProject() {
    if (!confirm("Delete this whole project? This cannot be undone.")) return;
    deleteProject(project!.id);
    router.replace("/pro/projects");
  }

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header back title={project.title} />

      <div
        className="h-32 relative"
        style={{ background: `linear-gradient(135deg, ${project.posterColor}cc, ${project.posterColor}33)` }}
      >
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-white/80 font-semibold">
              {project.type} · {project.studio}
            </span>
            {project.mode === "quick" && (
              <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-plum/40 text-white font-bold uppercase tracking-wider">
                <Zap className="w-2.5 h-2.5" /> Quick Cast
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl tracking-editorial text-white">{project.title}</h1>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {project.description && (
          <p className="text-sm text-text-muted leading-relaxed">{project.description}</p>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-text-muted">
            Roles <span className="text-text font-semibold tnum">({roles.length})</span>
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBulk(true)}
              className="text-[11px] text-gold font-semibold inline-flex items-center gap-1"
            >
              <Wand2 className="w-3 h-3" /> AI Bulk
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="text-[11px] text-gold font-semibold inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add role
            </button>
          </div>
        </div>

        {roles.length === 0 ? (
          <EmptyState
            icon={Users}
            tone="gold"
            title="No roles yet"
            description="Add roles (characters) to start collecting audition tapes for each one."
            ctaLabel="Add first role"
            ctaOnClick={() => setShowNew(true)}
          />
        ) : (
          <div className="space-y-2.5">
            {roles.map((r, i) => (
              <RoleCard
                key={r.id}
                role={r}
                i={i}
                onDelete={() => removeRole(r.id)}
              />
            ))}
          </div>
        )}

        {/* Chemistry mode — only when there are 2+ roles */}
        {roles.length >= 2 && (
          <Link
            href={`/pro/projects/${project.id}/chemistry`}
            className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-gold/10 via-bg-elevated to-plum/10 border border-gold/30"
          >
            <div className="w-10 h-10 rounded-xl bg-gold/20 text-gold grid place-items-center shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Chemistry mode</div>
              <div className="text-[10px] text-text-muted">Pair tapes from two roles side-by-side to test the match.</div>
            </div>
            <ArrowRight className="w-4 h-4 text-gold" />
          </Link>
        )}

        {/* Optional add-on panels — all collapsed by default */}
        <div className="space-y-2 pt-2">
          <ProjectInsights projectId={project.id} />
          <ProjectTeam projectId={project.id} />
        </div>

        <button
          onClick={removeProject}
          className="w-full mt-6 h-11 rounded-2xl border border-danger/30 text-danger text-xs font-semibold flex items-center justify-center gap-2"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete project
        </button>
      </div>

      {showNew && (
        <NewRoleSheet
          projectId={project.id}
          onClose={() => setShowNew(false)}
          onCreated={() => { reload(); setShowNew(false); }}
        />
      )}

      {showBulk && (
        <BulkRolesSheet
          projectId={project.id}
          mode={project.mode ?? "full"}
          onClose={() => setShowBulk(false)}
          onCreated={() => { reload(); setShowBulk(false); }}
        />
      )}
    </div>
  );
}

function RoleCard({ role, i, onDelete }: { role: Role; i: number; onDelete: () => void }) {
  const c = roleCounts(role.id);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="rounded-2xl bg-bg-elevated border border-border overflow-hidden"
    >
      <Link href={`/pro/projects/${role.projectId}/role/${role.id}`} className="block p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-plum/20 grid place-items-center shrink-0">
            <Users className="w-5 h-5 text-plum-light" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm truncate">{role.name}</h3>
              <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2 mt-0.5">{role.description}</p>
            <div className="flex items-center gap-3 mt-2 text-[10px] flex-wrap">
              <span className="inline-flex items-center gap-1 text-text-muted">
                <FileVideo className="w-3 h-3" /> {c.total} {c.total === 1 ? "submission" : "submissions"}
              </span>
              {c.submitted > 0 && <span className="text-gold font-semibold">{c.submitted} to review</span>}
              {c.callback > 0 && <span className="text-success font-semibold">{c.callback} callback{c.callback > 1 ? "s" : ""}</span>}
              {c.booked > 0 && <span className="text-success font-semibold">{c.booked} booked</span>}
            </div>
          </div>
        </div>
      </Link>
      <button
        onClick={onDelete}
        className="w-full h-8 text-[10px] text-text-muted border-t border-border hover:text-danger"
      >
        Remove role
      </button>
    </motion.div>
  );
}

function NewRoleSheet({ projectId, onClose, onCreated }: { projectId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sides, setSides] = useState("");
  const [sidesFile, setSidesFile] = useState<RoleSidesFile | undefined>(undefined);
  const [instructions, setInstructions] = useState("Slate first (name + height). Vertical, well-lit. Two takes max.");
  const [deadline, setDeadline] = useState("");
  const [shootDates, setShootDates] = useState("");
  const [payRange, setPayRange] = useState("");

  // Temporary roleId used for namespacing the IDB key during upload.
  // The role hasn't been created yet, but it doesn't matter — the key is
  // unique and the file will be saved with the (final) created role anyway.
  const [tempRoleId] = useState(() => `pending-${Date.now()}`);

  function submit() {
    if (!name.trim()) return;
    addRole({
      projectId,
      name: name.trim(),
      description: description.trim(),
      sides: sides.trim() || undefined,
      sidesFile,
      selfTapeInstructions: instructions.trim() || undefined,
      deadline: deadline || undefined,
      shootDates: shootDates.trim() || undefined,
      payRange: payRange.trim() || undefined,
    });
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5 max-h-[90dvh] overflow-y-auto"
      >
        <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />
        <h2 className="font-display text-2xl mb-4">Add a role</h2>

        <div className="space-y-3">
          <Sect label="Role name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya — Lead"
              className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
            />
          </Sect>
          <Sect label="Character brief">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Age, gender, languages, key traits…"
              className="w-full px-3 py-2 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
            />
          </Sect>
          <Sect label="Sides (scene text)" hint="Paste the scene or instructions for what they should perform">
            <textarea
              value={sides}
              onChange={(e) => setSides(e.target.value)}
              rows={4}
              placeholder="INT. KITCHEN — NIGHT&#10;MAYA: I told you I'm not doing it…"
              className="w-full px-3 py-2 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60 font-mono"
            />
          </Sect>
          <Sect label="Sides file (אופציונלי)" hint="קובץ PDF / DOC / TXT שהשחקנים יוכלו להוריד">
            <SidesFileInput
              roleId={tempRoleId}
              value={sidesFile}
              onChange={setSidesFile}
            />
          </Sect>
          <Sect label="Self-tape instructions">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
            />
          </Sect>
          <div className="grid grid-cols-2 gap-2.5">
            <Sect label="Tape deadline">
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
              />
            </Sect>
            <Sect label="Shoot dates">
              <input
                value={shootDates}
                onChange={(e) => setShootDates(e.target.value)}
                placeholder="Aug 12 – Sep 25"
                className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
              />
            </Sect>
          </div>
          <Sect label="Pay / Rate (optional)">
            <input
              value={payRange}
              onChange={(e) => setPayRange(e.target.value)}
              placeholder="$1.5–2K/day + travel"
              className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
            />
          </Sect>
        </div>

        <button
          onClick={submit}
          disabled={!name.trim()}
          className={cn(
            "mt-5 w-full h-12 rounded-2xl font-semibold flex items-center justify-center gap-2",
            name.trim() ? "bg-gold text-bg" : "bg-bg text-text-subtle"
          )}
        >
          Add role <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}

function Sect({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-text-muted">{label}</div>
      {hint && <div className="text-[10px] text-text-subtle mt-0.5">{hint}</div>}
      <div className="mt-1">{children}</div>
    </div>
  );
}
