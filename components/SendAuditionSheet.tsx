"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, FolderOpen, Users, CheckCircle2, ArrowRight, X } from "lucide-react";
import {
  loadProjects, getRolesByProject, getRole, inviteTalent,
  type Project, type Role,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  talent: { id: string; name: string; photo: string };
};

export function SendAuditionSheet({ open, onClose, talent }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProjects(loadProjects());
    setProject(null);
    setRoles([]);
    setRoleId("");
    setDeadline("");
    setMessage(`Hi ${talent.name.split(" ")[0]} — we'd love you to read for a role we're casting. Sides + instructions attached. Please submit your self-tape by the deadline.`);
    setSent(false);
  }, [open, talent.name]);

  useEffect(() => {
    if (!project) { setRoles([]); setRoleId(""); return; }
    const r = getRolesByProject(project.id);
    setRoles(r);
    setRoleId(r[0]?.id ?? "");
  }, [project]);

  // Pre-fill deadline from the role's own deadline (if any)
  useEffect(() => {
    if (!roleId) return;
    const r = getRole(roleId);
    if (r?.deadline) setDeadline(r.deadline);
  }, [roleId]);

  function submit() {
    if (!roleId) return;
    inviteTalent(roleId, talent, { message: message.trim(), deadline: deadline || undefined });
    setSent(true);
    setTimeout(() => { onClose(); }, 1400);
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
            className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5 max-h-[85dvh] overflow-y-auto"
          >
            <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />

            {sent ? (
              <SentConfirmation talentName={talent.name} />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gold">Send audition invite</div>
                    <h2 className="font-display text-xl">To: {talent.name}</h2>
                  </div>
                  <button onClick={onClose} className="p-2 -mr-2 text-text-muted">
                    <X className="w-5 h-5" />
                  </button>
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

                        <Label className="mt-4">Tape deadline</Label>
                        <input
                          type="date"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                          className="w-full mt-1.5 h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                        />

                        <Label className="mt-4">Personal note</Label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={4}
                          className="w-full mt-1.5 px-3 py-2.5 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                        />
                      </>
                    )}

                    <button
                      onClick={submit}
                      disabled={!roleId}
                      className={cn(
                        "mt-5 w-full h-12 rounded-2xl font-semibold flex items-center justify-center gap-2",
                        roleId ? "bg-gold text-bg" : "bg-bg text-text-subtle"
                      )}
                    >
                      Send invite <Send className="w-4 h-4" />
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

function SentConfirmation({ talentName }: { talentName: string }) {
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
      <h3 className="font-display text-xl">Invite sent</h3>
      <p className="text-sm text-text-muted mt-1">
        {talentName.split(" ")[0]} will get a notification with your message.
      </p>
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
