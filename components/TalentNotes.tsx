"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StickyNote, Tag, X, Check, Plus, Lock } from "lucide-react";
import { getTalentNote, setTalentNote, getAllTags } from "@/lib/talent-notes-store";
import { cn } from "@/lib/utils";

// Optional pro-only notes & tags about a talent.
// Renders collapsed by default — pro can ignore it entirely.
export function TalentNotes({ talentId, talentName }: { talentId: string; talentName?: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const n = getTalentNote(talentId);
    setNote(n.note);
    setTags(n.tags);
    setExistingTags(getAllTags());
  }, [talentId]);

  function save() {
    setTalentNote(talentId, note, tags);
    setExistingTags(getAllTags());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function addTag(t: string) {
    const clean = t.trim();
    if (!clean || tags.includes(clean)) return;
    setTags([...tags, clean]);
    setNewTag("");
  }
  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  const hasContent = note.trim().length > 0 || tags.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-bg-elevated overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-3"
      >
        <div className="w-8 h-8 rounded-lg bg-bg grid place-items-center shrink-0">
          <StickyNote className="w-4 h-4 text-text-muted" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">Private notes</span>
            <Lock className="w-3 h-3 text-text-subtle" />
          </div>
          <div className="text-[10px] text-text-muted">
            {hasContent
              ? `${tags.length} tag${tags.length === 1 ? "" : "s"}${note ? " · note saved" : ""}`
              : "Optional — only you see these"}
          </div>
        </div>
        {tags.length > 0 && !open && (
          <div className="flex gap-1 max-w-[120px] overflow-hidden">
            {tags.slice(0, 2).map((t) => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30 truncate">
                {t}
              </span>
            ))}
          </div>
        )}
        <span className={cn(
          "text-text-muted text-xs transition-transform",
          open ? "rotate-180" : ""
        )}>▾</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
              {/* Tags */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-muted mb-1.5 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Tags
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-[11px]">
                        {t}
                        <button onClick={() => removeTag(t)} className="w-5 h-5 grid place-items-center rounded-full hover:bg-gold/20">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5">
                  <input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(newTag); } }}
                    placeholder="e.g. July avail, Strong reader…"
                    className="flex-1 h-9 px-3 rounded-full bg-bg border border-border text-xs outline-none focus:border-gold/60"
                  />
                  <button
                    onClick={() => addTag(newTag)}
                    disabled={!newTag.trim()}
                    className={cn(
                      "h-9 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1",
                      newTag.trim() ? "bg-gold text-bg" : "bg-bg text-text-subtle"
                    )}
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                {/* Suggested existing tags */}
                {existingTags.filter((t) => !tags.includes(t)).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {existingTags.filter((t) => !tags.includes(t)).slice(0, 6).map((t) => (
                      <button
                        key={t}
                        onClick={() => addTag(t)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-bg border border-border text-text-muted hover:border-gold/40 hover:text-gold"
                      >+ {t}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-muted mb-1.5">
                  Note {talentName && <span className="text-text-subtle">about {talentName.split(" ")[0]}</span>}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Anything you want to remember — strengths, dates, references…"
                  className="w-full px-3 py-2 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                />
              </div>

              <button
                onClick={save}
                className={cn(
                  "w-full h-10 rounded-2xl text-sm font-semibold inline-flex items-center justify-center gap-2",
                  saved ? "bg-success text-bg" : "bg-gold text-bg"
                )}
              >
                {saved ? <><Check className="w-4 h-4" /> Saved</> : "Save notes"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
