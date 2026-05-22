"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Copy, CheckCircle2, X, ExternalLink, Clock, FolderOpen } from "lucide-react";
import { createPacket, type SharePacket } from "@/lib/share-store";
import { loadProjects, getRolesByProject, type Project, type Role } from "@/lib/projects-store";
import { TALENTS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  talentIds: string[];
};

const EXPIRY_OPTIONS = [
  { label: "24 hours", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "No expiry", days: 0 },
];

export function CreateShareLinkSheet({ open, onClose, talentIds }: Props) {
  const [title, setTitle] = useState("Shortlist");
  const [note, setNote] = useState("");
  const [expiryDays, setExpiryDays] = useState(7);
  const [packet, setPacket] = useState<SharePacket | null>(null);
  const [copied, setCopied] = useState(false);

  // Optional: tag the packet with a project/role for context
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [roleId, setRoleId] = useState<string>("");
  const roles = useMemo(() => projectId ? getRolesByProject(projectId) : [], [projectId]);

  useEffect(() => {
    if (!open) return;
    setProjects(loadProjects());
    setTitle("Shortlist");
    setNote("");
    setExpiryDays(7);
    setProjectId("");
    setRoleId("");
    setPacket(null);
    setCopied(false);
  }, [open]);

  const previews = talentIds
    .map((id) => TALENTS.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);

  const proj = projects.find((p) => p.id === projectId);
  const role = roles.find((r) => r.id === roleId);

  function create() {
    const p = createPacket({
      title: title.trim() || "Shortlist",
      note: note.trim() || undefined,
      projectTitle: proj?.title,
      roleName: role?.name,
      talentIds,
      expiresInDays: expiryDays > 0 ? expiryDays : undefined,
    });
    setPacket(p);
  }

  const shareUrl = packet
    ? (typeof window !== "undefined" ? `${window.location.origin}/share/${packet.slug}` : `/share/${packet.slug}`)
    : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
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

            {packet ? (
              <div>
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}
                  className="w-14 h-14 rounded-full bg-success/15 grid place-items-center mx-auto mb-3"
                >
                  <CheckCircle2 className="w-7 h-7 text-success" />
                </motion.div>
                <h2 className="font-display text-xl text-center">Link ready</h2>
                <p className="text-xs text-text-muted text-center mt-1">
                  Anyone with this link can view {previews.length} talent{previews.length !== 1 ? "s" : ""} —{" "}
                  {packet.expiresAt ? `expires ${new Date(packet.expiresAt).toLocaleDateString()}` : "no expiry"}
                </p>

                <div className="mt-5 flex items-center gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 h-11 px-3 rounded-2xl bg-bg border border-border text-xs outline-none"
                  />
                  <button
                    onClick={copy}
                    className={cn(
                      "h-11 px-3 rounded-2xl text-xs font-semibold inline-flex items-center gap-1.5 shrink-0",
                      copied ? "bg-success text-white" : "bg-gold text-bg"
                    )}
                  >
                    {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 w-full h-11 rounded-2xl bg-bg border border-border text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Preview in new tab
                </a>

                <button
                  onClick={onClose}
                  className="mt-4 w-full text-[11px] text-text-muted underline"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gold flex items-center gap-1.5">
                      <Share2 className="w-3 h-3" /> Share shortlist
                    </div>
                    <h2 className="font-display text-xl">
                      {previews.length} talent{previews.length !== 1 ? "s" : ""}
                    </h2>
                  </div>
                  <button onClick={onClose} className="p-2 -mr-2 text-text-muted">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Talent strip */}
                <div className="flex items-center -space-x-2 mb-4">
                  {previews.slice(0, 8).map((t) => (
                    <img
                      key={t.id}
                      src={t.photo}
                      alt={t.name}
                      title={t.name}
                      className="w-9 h-9 rounded-full border-2 border-bg-elevated object-cover"
                    />
                  ))}
                  {previews.length > 8 && (
                    <span className="w-9 h-9 rounded-full bg-bg border-2 border-bg-elevated grid place-items-center text-[10px] font-semibold text-text-muted">
                      +{previews.length - 8}
                    </span>
                  )}
                </div>

                <Label>Title (shown to the viewer)</Label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Maya — final 4"
                  className="w-full mt-1.5 h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                />

                <Label className="mt-4">Note (optional)</Label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Watch tape 2 first — strongest read."
                  className="w-full mt-1.5 px-3 py-2.5 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                />

                {projects.length > 0 && (
                  <>
                    <Label icon={FolderOpen} className="mt-4">Tag with project (optional)</Label>
                    <select
                      value={projectId}
                      onChange={(e) => { setProjectId(e.target.value); setRoleId(""); }}
                      className="w-full mt-1.5 h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                    >
                      <option value="">— None —</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>

                    {projectId && roles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {roles.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => setRoleId(r.id === roleId ? "" : r.id)}
                            className={cn(
                              "h-8 px-3 rounded-full text-[11px] font-semibold border",
                              roleId === r.id ? "bg-gold text-bg border-gold" : "bg-bg text-text border-border"
                            )}
                          >{r.name}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <Label icon={Clock} className="mt-4">Expiry</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setExpiryDays(opt.days)}
                      className={cn(
                        "h-8 px-3 rounded-full text-[11px] font-semibold border",
                        expiryDays === opt.days ? "bg-gold text-bg border-gold" : "bg-bg text-text border-border"
                      )}
                    >{opt.label}</button>
                  ))}
                </div>

                <button
                  onClick={create}
                  disabled={previews.length === 0}
                  className={cn(
                    "mt-5 w-full h-12 rounded-2xl font-semibold flex items-center justify-center gap-2",
                    previews.length > 0 ? "bg-gold text-bg" : "bg-bg text-text-subtle"
                  )}
                >
                  Create share link <Share2 className="w-4 h-4" />
                </button>
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
