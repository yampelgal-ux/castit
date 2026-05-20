"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users2, Plus, X, Mail, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Optional team-members panel. Pro can invite collaborators (director, producer, agent)
// to a project. Persisted locally — in production this would be a real share link / DB.

type Member = {
  id: string;
  name: string;
  email: string;
  role: "Director" | "Producer" | "Agent" | "Assistant" | "Other";
};

function loadMembers(projectId: string): Member[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(localStorage.getItem("castit_project_team_v1") || "{}");
    return all[projectId] ?? [];
  } catch { return []; }
}
function saveMembers(projectId: string, list: Member[]) {
  if (typeof window === "undefined") return;
  const all = JSON.parse(localStorage.getItem("castit_project_team_v1") || "{}");
  all[projectId] = list;
  localStorage.setItem("castit_project_team_v1", JSON.stringify(all));
}

const ROLES: Member["role"][] = ["Director", "Producer", "Agent", "Assistant", "Other"];

export function ProjectTeam({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("Director");

  useEffect(() => { setMembers(loadMembers(projectId)); }, [projectId]);

  function addMember() {
    if (!name.trim() || !email.trim()) return;
    const next: Member = {
      id: Math.random().toString(36).slice(2, 9),
      name: name.trim(),
      email: email.trim(),
      role,
    };
    const list = [...members, next];
    setMembers(list);
    saveMembers(projectId, list);
    setName(""); setEmail(""); setRole("Director");
    setShowInvite(false);
  }

  function remove(id: string) {
    const list = members.filter((m) => m.id !== id);
    setMembers(list);
    saveMembers(projectId, list);
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-elevated overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 p-3">
        <div className="w-8 h-8 rounded-lg bg-bg grid place-items-center shrink-0">
          <Users2 className="w-4 h-4 text-text-muted" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold">Team</div>
          <div className="text-[10px] text-text-muted">
            {members.length === 0
              ? "Optional — invite directors, producers, agents to collaborate"
              : `${members.length} member${members.length === 1 ? "" : "s"}`}
          </div>
        </div>
        {members.length > 0 && !open && (
          <div className="flex -space-x-1.5">
            {members.slice(0, 3).map((m) => (
              <div key={m.id} className="w-6 h-6 rounded-full bg-plum/30 border-2 border-bg-elevated text-[9px] grid place-items-center font-bold">
                {m.name[0]?.toUpperCase()}
              </div>
            ))}
          </div>
        )}
        <span className={cn("text-text-muted text-xs transition-transform", open ? "rotate-180" : "")}>▾</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 border-t border-border pt-3 space-y-2">
              {members.length === 0 ? (
                <p className="text-xs text-text-muted px-1">
                  No team members yet. You don't need any — but adding a director or producer
                  gives them visibility into the casting funnel.
                </p>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-bg border border-border">
                    <div className="w-8 h-8 rounded-full bg-plum/30 grid place-items-center font-bold text-xs shrink-0">
                      {m.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{m.name}</div>
                      <div className="text-[10px] text-text-muted truncate">
                        {m.role} · {m.email}
                      </div>
                    </div>
                    <button onClick={() => remove(m.id)} className="p-1 text-text-muted hover:text-danger">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}

              {!showInvite ? (
                <button
                  onClick={() => setShowInvite(true)}
                  className="w-full h-10 rounded-2xl border border-dashed border-border text-xs text-text-muted hover:text-gold hover:border-gold/40 inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Invite a collaborator
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-bg border border-border space-y-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
                    className="w-full h-9 px-3 rounded-xl bg-bg-elevated border border-border text-xs outline-none focus:border-gold/60" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email"
                    className="w-full h-9 px-3 rounded-xl bg-bg-elevated border border-border text-xs outline-none focus:border-gold/60" />
                  <div className="flex flex-wrap gap-1">
                    {ROLES.map((r) => (
                      <button key={r} onClick={() => setRole(r)}
                        className={cn(
                          "h-7 px-2.5 rounded-full text-[10px] font-semibold border",
                          role === r ? "bg-gold text-bg border-gold" : "bg-bg-elevated text-text border-border"
                        )}
                      >{r}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setShowInvite(false); setName(""); setEmail(""); }}
                      className="h-9 rounded-xl border border-border text-xs font-semibold">Cancel</button>
                    <button onClick={addMember} disabled={!name.trim() || !email.trim()}
                      className={cn(
                        "h-9 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1",
                        name.trim() && email.trim() ? "bg-gold text-bg" : "bg-bg text-text-subtle"
                      )}
                    >
                      <Mail className="w-3 h-3" /> Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
