"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, FileVideo, X, ChevronDown, Sparkles, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { StageBadge } from "@/components/StageBadge";
import {
  getProject, getRolesByProject, getSubmissionsByRole,
  type Project, type Role, type Submission,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";

// Chemistry mode: pro picks one submission from each of two different roles
// in the same project and plays the tapes side-by-side to gauge chemistry.
export default function ChemistryPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  const [roleAId, setRoleAId] = useState<string>("");
  const [roleBId, setRoleBId] = useState<string>("");
  const [pickAId, setPickAId] = useState<string>("");
  const [pickBId, setPickBId] = useState<string>("");

  useEffect(() => {
    setProject(getProject(id) ?? null);
    const rs = getRolesByProject(id);
    setRoles(rs);
    if (rs[0]) setRoleAId(rs[0].id);
    if (rs[1]) setRoleBId(rs[1].id);
  }, [id]);

  const subsA = useMemo(() => roleAId ? getSubmissionsByRole(roleAId).filter((s) => s.tapes.length > 0) : [], [roleAId]);
  const subsB = useMemo(() => roleBId ? getSubmissionsByRole(roleBId).filter((s) => s.tapes.length > 0) : [], [roleBId]);

  if (!project) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="Chemistry" />
        <EmptyState icon={Users} title="Project not found" />
      </div>
    );
  }

  if (roles.length < 2) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="Chemistry" />
        <div className="px-5 pt-3">
          <EmptyState
            icon={Heart}
            title="Need at least two roles"
            description="Add another role to this project — then you can pair their tapes here."
          />
        </div>
      </div>
    );
  }

  const subA = subsA.find((s) => s.id === pickAId);
  const subB = subsB.find((s) => s.id === pickBId);

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header back title="Chemistry" />

      <div className="px-5 pt-3 space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-gold flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Side-by-side casting check
          </div>
          <h1 className="font-display text-2xl tracking-editorial leading-tight">{project.title}</h1>
          <p className="text-sm text-text-muted mt-1">
            Pair one talent from each role to see if they fit together on screen.
          </p>
        </div>

        {/* Role pickers */}
        <div className="grid grid-cols-2 gap-2">
          <RolePicker
            label="Role A"
            roles={roles}
            value={roleAId}
            onChange={(id) => { setRoleAId(id); setPickAId(""); }}
            disabledIds={[roleBId]}
          />
          <RolePicker
            label="Role B"
            roles={roles}
            value={roleBId}
            onChange={(id) => { setRoleBId(id); setPickBId(""); }}
            disabledIds={[roleAId]}
          />
        </div>

        {/* Side-by-side */}
        <div className="grid grid-cols-2 gap-3">
          <ChemistryColumn
            label={roles.find((r) => r.id === roleAId)?.name ?? "Role A"}
            subs={subsA}
            picked={subA}
            onPick={setPickAId}
            color="gold"
          />
          <ChemistryColumn
            label={roles.find((r) => r.id === roleBId)?.name ?? "Role B"}
            subs={subsB}
            picked={subB}
            onPick={setPickBId}
            color="plum"
          />
        </div>

        {/* Verdict panel */}
        {subA && subB && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gold/30 bg-gold/8 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-gold" />
              <span className="text-xs font-semibold uppercase tracking-widest text-gold">Pair preview</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <img src={subA.talentPhoto} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{subA.talentName}</div>
                  <div className="text-[10px] text-text-muted truncate">as {roles.find((r) => r.id === subA.roleId)?.name}</div>
                </div>
              </div>
              <div className="text-text-subtle">×</div>
              <div className="flex items-center gap-2 min-w-0">
                <img src={subB.talentPhoto} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{subB.talentName}</div>
                  <div className="text-[10px] text-text-muted truncate">as {roles.find((r) => r.id === subB.roleId)?.name}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function RolePicker({ label, roles, value, onChange, disabledIds }: {
  label: string;
  roles: Role[];
  value: string;
  onChange: (id: string) => void;
  disabledIds: string[];
}) {
  return (
    <div className="rounded-2xl bg-bg-elevated border border-border p-2">
      <div className="text-[10px] uppercase tracking-widest text-text-muted mb-1 px-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-2 rounded-xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
      >
        <option value="">Pick a role…</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id} disabled={disabledIds.includes(r.id)}>
            {r.name}{disabledIds.includes(r.id) ? " (in use)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChemistryColumn({
  label, subs, picked, onPick, color,
}: {
  label: string;
  subs: Submission[];
  picked?: Submission;
  onPick: (id: string) => void;
  color: "gold" | "plum";
}) {
  const colorCls = color === "gold" ? "border-gold/40 bg-gold/5" : "border-plum-light/40 bg-plum/10";
  return (
    <div className="rounded-2xl border border-border bg-bg-elevated overflow-hidden">
      <div className={cn("p-2 text-center border-b border-border", colorCls)}>
        <div className="text-[10px] uppercase tracking-widest font-semibold truncate">{label}</div>
      </div>

      {picked ? (
        <div className="p-1.5">
          <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden relative">
            {picked.tapes[picked.tapes.length - 1]?.videoUrl ? (
              <video
                src={picked.tapes[picked.tapes.length - 1].videoUrl}
                controls
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-text-muted">
                <FileVideo className="w-8 h-8" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <img src={picked.talentPhoto} alt="" className="w-6 h-6 rounded-full object-cover" />
            <span className="text-xs font-semibold truncate flex-1">{picked.talentName}</span>
            <button onClick={() => onPick("")} className="text-text-muted hover:text-danger p-0.5">
              <X className="w-3 h-3" />
            </button>
          </div>
          <StageBadge stage={picked.stage} />
        </div>
      ) : (
        <div className="p-2">
          {subs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-[11px] text-text-muted min-h-[200px] grid place-items-center">
              No tapes yet for this role
            </div>
          ) : (
            <div className="space-y-1 max-h-[40dvh] overflow-y-auto">
              {subs.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onPick(s.id)}
                  className="w-full flex items-center gap-2 p-1.5 rounded-lg bg-bg border border-border hover:border-gold/40 text-left"
                >
                  <img src={s.talentPhoto} alt="" className="w-7 h-7 rounded-md object-cover shrink-0" />
                  <span className="text-[11px] font-semibold truncate flex-1">{s.talentName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
