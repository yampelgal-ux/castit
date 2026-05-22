"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, FolderOpen, Users, CheckCircle2, ArrowRight, X, AlertCircle } from "lucide-react";
import {
  loadProjects, getRolesByProject, getRole, inviteTalent, loadSubmissions,
  type Project, type Role,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";

type Talent = { id: string; name: string; photo: string };

type Props = {
  open: boolean;
  onClose: () => void;
  talents: Talent[];
  onSent?: () => void;
};

export function BulkInviteSheet({ open, onClose, talents, onSent }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState<string>("");
  const [deadline, setDeadline] = useState("");
  const [message, setMessage] = useState("");
  const [skipExisting, setSkipExisting] = useState(true);
  const [sent, setSent] = useState<{ invited: number; skipped: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setProjects(loadProjects());
    setProject(null);
    setRoles([]);
    setRoleId("");
    setDeadline("");
    setMessage(`Hi — we'd love you to read for a role we're casting. Sides + instructions attached. Please submit your self-tape by the deadline.`);
    setSent(null);
  }, [open]);

  useEffect(() => {
    if (!project) { setRoles([]); setRoleId(""); return; }
    const r = getRolesByProject(project.id);
    setRoles(r);
    setRoleId(r[0]?.id ?? "");
  }, [project]);

  useEffect(() => {
    if (!roleId) return;
    const r = getRole(roleId);
    if (r?.deadline) setDeadline(r.deadline);
  }, [roleId]);

  // How many of the selected talents are already on this role?
  const alreadyOnRole = useMemo(() => {
    if (!roleId) return new Set<string>();
    const ids = new Set(
      loadSubmissions()
        .filter((s) => s.roleId === roleId)
        .map((s) => s.talentId)
    );
    return new Set(talents.filter((t) => ids.has(t.id)).map((t) => t.id));
  }, [roleId, talents]);

  const willInvite = skipExisting
    ? talents.filter((t) => !alreadyOnRole.has(t.id))
    : talents;

  function submit() {
    if (!roleId) return;
    let invited = 0;
    let skipped = 0;
    talents.forEach((t) => {
      if (skipExisting && alreadyOnRole.has(t.id)) {
        skipped++;
        return;
      }
      inviteTalent(roleId, t, { message: message.trim(), deadline: deadline || undefined });
      invited++;
    });
    setSent({ invited, skipped });
    setTimeout(() => { onSent?.(); }, 1600);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5 max-h-[88dvh] overflow-y-auto"
          >
            <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />

            {sent ? (
              <SentConfirmation invited={sent.invited} skipped={sent.skipped} />
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gold">Bulk invite</div>
                    <h2 className="font-display text-xl">
                      {talents.length} talent{talents.length !== 1 ? "s" : ""} selected
                    </h2>
                  </div>
                  <button onClick={onClose} className="p-2 -mr-2 text-text-muted">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Avatar strip */}
                <div className="flex items-center -space-x-2 mb-4">
                  {talents.slice(0, 8).map((t) => (
                    <img
                      key={t.id}
                      src={t.photo}
                      alt={t.name}
                      title={t.name}
                      className="w-9 h-9 rounded-full border-2 border-bg-elevated object-cover"
                    />
                  ))}
                  {talents.length > 8 && (
                    <span className="w-9 h-9 rounded-full bg-bg border-2 border-bg-elevated grid place-items-center text-[10px] font-semibold text-text-muted">
                      +{talents.length - 8}
                    </span>
                  )}
                </div>

                {projects.length === 0 ? (
                  <EmptyProjects onClose={onClose} />
                ) : (
                  <>
                    <Label icon={FolderOpen}>Project</Label>
                    <div className="grid grid-cols-1 gap-2 mt-1.5">
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setProject(p)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all",
                            project?.id === p.id ? "border-gold bg-gold/8" : "border-border bg-bg hover:border-border-strong"
                          )}
                        >
                          <div
                            className="w-10 h-10 rounded-xl shrink-0"
                            style={{ background: `linear-gradient(135deg, ${p.posterColor}, ${p.posterColor}66)` }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{p.title}</div>
                            <div className="text-[10px] text-text-muted truncate">{p.type} · {p.studio}</div>
                          </div>
                          {project?.id === p.id && <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />}
                        </button>
                      ))}
                    </div>

                    {project && (
                      <>
                        <Label icon={Users} className="mt-4">Role</Label>
                        {roles.length === 0 ? (
                          <p className="text-xs text-text-muted mt-2 px-1">
                            This project has no roles yet — add one first.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {roles.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => setRoleId(r.id)}
                                className={cn(
                                  "px-3 h-9 rounded-full text-xs font-semibold border",
                                  roleId === r.id ? "bg-gold text-bg border-gold" : "bg-bg text-text border-border"
                                )}
                              >{r.name}</button>
                            ))}
                          </div>
                        )}

                        {alreadyOnRole.size > 0 && (
                          <div className="mt-3 p-2.5 rounded-xl bg-gold/8 border border-gold/30 flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                            <div className="text-[11px] text-text leading-relaxed flex-1">
                              <span className="font-semibold tnum">{alreadyOnRole.size}</span> of the selected talents are already on this role.
                              <label className="flex items-center gap-1.5 mt-1.5">
                                <input
                                  type="checkbox"
                                  checked={skipExisting}
                                  onChange={(e) => setSkipExisting(e.target.checked)}
                                  className="accent-gold"
                                />
                                <span className="text-text-muted">Skip them (recommended)</span>
                              </label>
                            </div>
                          </div>
                        )}

                        <Label className="mt-4">Tape deadline</Label>
                        <input
                          type="date"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                          className="w-full mt-1.5 h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                        />

                        <Label className="mt-4">Message (sent to all)</Label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={4}
                          className="w-full mt-1.5 px-3 py-2.5 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                        />
                        <p className="text-[10px] text-text-subtle mt-1.5 px-1">
                          Each talent gets the same message. No personal data is shared between recipients.
                        </p>
                      </>
                    )}

                    <button
                      onClick={submit}
                      disabled={!roleId || willInvite.length === 0}
                      className={cn(
                        "mt-5 w-full h-12 rounded-2xl font-semibold flex items-center justify-center gap-2",
                        roleId && willInvite.length > 0 ? "bg-gold text-bg" : "bg-bg text-text-subtle"
                      )}
                    >
                      Send {willInvite.length} invite{willInvite.length !== 1 ? "s" : ""} <Send className="w-4 h-4" />
                    </button>
                  </>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Label({ children, icon: Icon, className }: { children: React.ReactNode; icon?: any; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-text-muted", className)}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </div>
  );
}

function SentConfirmation({ invited, skipped }: { invited: number; skipped: number }) {
  return (
    <div className="text-center py-10">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 12 }}
        className="w-16 h-16 rounded-full bg-success/15 grid place-items-center mx-auto mb-4"
      >
        <CheckCircle2 className="w-8 h-8 text-success" />
      </motion.div>
      <h3 className="font-display text-xl">
        {invited} invite{invited !== 1 ? "s" : ""} sent
      </h3>
      {skipped > 0 && (
        <p className="text-xs text-text-muted mt-1">
          {skipped} skipped (already on this role)
        </p>
      )}
    </div>
  );
}

function EmptyProjects({ onClose }: { onClose: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-2xl bg-gold/10 text-gold grid place-items-center mx-auto mb-3">
        <FolderOpen className="w-6 h-6" />
      </div>
      <h3 className="font-display text-lg mb-1">No projects yet</h3>
      <p className="text-xs text-text-muted max-w-[260px] mx-auto">
        Create a casting project first — then you can invite talents to read for specific roles.
      </p>
      <a
        href="/pro/projects"
        onClick={onClose}
        className="inline-flex items-center gap-2 mt-5 px-5 h-11 rounded-full bg-gold text-bg text-sm font-semibold"
      >
        Create project <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}
