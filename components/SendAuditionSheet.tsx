"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, FolderOpen, Users, CheckCircle2, ArrowRight, X } from "lucide-react";
import {
  loadProjects, getRolesByProject, getRole, inviteTalent,
  type Project, type Role,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useCanContactTalent } from "@/lib/cloud/trust";
import { NotApprovedNotice } from "@/components/TrustBanners";
import { optLabel } from "@/lib/typecast-options";

type Props = {
  open: boolean;
  onClose: () => void;
  talent: { id: string; name: string; photo: string };
};

export function SendAuditionSheet({ open, onClose, talent }: Props) {
  const { lang } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const can = useCanContactTalent();
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
    const first = talent.name.split(" ")[0];
    setMessage(he
      ? `היי ${first}, נשמח שתקרא/י לתפקיד שאנחנו מלהקים. הטקסט וההנחיות מצורפים. אפשר להגיש טייפ עד הדדליין.`
      : `Hi ${first}, we'd love you to read for a role we're casting. Sides and instructions attached. Please submit your self-tape by the deadline.`);
    setSent(false);
  }, [open, talent.name, he]);

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
    if (!roleId || !can.ok) return;
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
            dir={he ? "rtl" : "ltr"}
          >
            <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />

            {sent ? (
              <SentConfirmation talentName={talent.name} he={he} />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[0.6875rem] uppercase tracking-widest text-gold">{L("הזמנה לאודישן", "Send audition invite")}</div>
                    <h2 className="font-display text-xl">{L("אל:", "To:")} {talent.name}</h2>
                  </div>
                  <button onClick={onClose} aria-label={L("סגירה", "Close")} className="p-2 -me-2 text-text-muted">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {!can.ok ? (
                  <NotApprovedNotice />
                ) : projects.length === 0 ? (
                  <EmptyProjects onClose={onClose} he={he} />
                ) : (
                  <>
                    <Label icon={FolderOpen}>{L("פרויקט", "Project")}</Label>
                    <div className="grid grid-cols-1 gap-2 mt-1.5">
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setProject(p)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl border text-start transition-all",
                            project?.id === p.id ? "border-gold bg-gold/8" : "border-border bg-bg hover:border-border-strong"
                          )}
                        >
                          <div
                            className="w-10 h-10 rounded-xl shrink-0"
                            style={{ background: `linear-gradient(135deg, ${p.posterColor}, ${p.posterColor}66)` }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{p.title}</div>
                            <div className="text-[0.6875rem] text-text-muted truncate">{optLabel(p.type, he)}{p.studio ? ` · ${p.studio}` : ""}</div>
                          </div>
                          {project?.id === p.id && <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />}
                        </button>
                      ))}
                    </div>

                    {project && (
                      <>
                        <Label icon={Users} className="mt-4">{L("תפקיד", "Role")}</Label>
                        {roles.length === 0 ? (
                          <p className="text-xs text-text-muted mt-2 px-1">
                            {L("בפרויקט הזה עוד אין תפקידים. צריך להוסיף אחד קודם.", "This project has no roles yet. Add one first.")}
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {roles.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => setRoleId(r.id)}
                                className={cn(
                                  "px-3 h-9 rounded-full text-xs font-semibold border",
                                  roleId === r.id ? "bg-gold text-on-accent border-gold" : "bg-bg text-text border-border"
                                )}
                              >{r.name}</button>
                            ))}
                          </div>
                        )}

                        <Label className="mt-4">{L("דדליין להגשת טייפ", "Tape deadline")}</Label>
                        <input
                          type="date"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                          className="w-full mt-1.5 h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                        />

                        <Label className="mt-4">{L("הודעה אישית", "Personal note")}</Label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={4} dir="auto"
                          className="w-full mt-1.5 px-3 py-2.5 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                        />
                      </>
                    )}

                    <button
                      onClick={submit}
                      disabled={!roleId}
                      className={cn(
                        "mt-5 w-full h-12 rounded-2xl font-semibold flex items-center justify-center gap-2",
                        roleId ? "bg-gold text-on-accent" : "bg-bg text-text-subtle"
                      )}
                    >
                      {L("שליחת הזמנה", "Send invite")} <Send className="w-4 h-4 rtl:-scale-x-100" />
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
    <div className={cn("flex items-center gap-1.5 text-[0.6875rem] uppercase tracking-widest text-text-muted", className)}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </div>
  );
}

function SentConfirmation({ talentName, he }: { talentName: string; he: boolean }) {
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
      <h3 className="font-display text-xl">{he ? "ההזמנה נשלחה" : "Invite sent"}</h3>
      <p className="text-sm text-text-muted mt-1">
        {he ? `${talentName.split(" ")[0]} יקבל/תקבל את ההזמנה עם ההודעה שלך.` : `${talentName.split(" ")[0]} will get a notification with your message.`}
      </p>
    </div>
  );
}

function EmptyProjects({ onClose, he }: { onClose: () => void; he: boolean }) {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-2xl bg-gold/10 text-gold grid place-items-center mx-auto mb-3">
        <FolderOpen className="w-6 h-6" />
      </div>
      <h3 className="font-display text-lg mb-1">{he ? "עוד אין פרויקטים" : "No projects yet"}</h3>
      <p className="text-xs text-text-muted max-w-[260px] mx-auto">
        {he ? "קודם יוצרים פרויקט ליהוק, ואז אפשר להזמין שחקנים לתפקידים ספציפיים." : "Create a casting project first, then invite talent to read for specific roles."}
      </p>
      <a
        href="/pro/projects"
        onClick={onClose}
        className="inline-flex items-center gap-2 mt-5 px-5 h-11 rounded-full bg-gold text-on-accent text-sm font-semibold"
      >
        {he ? "יצירת פרויקט" : "Create project"} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
      </a>
    </div>
  );
}
