"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, Eye, MessageCircle, X, Briefcase, MapPin, Calendar, DollarSign } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { CASTINGS, TALENTS } from "@/lib/mock-data";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type MyCasting = {
  id: string;
  title: string;
  studio: string;
  type: string;
  location: string;
  paid: boolean;
  deadline: string;
  description: string;
  applicants: number;
};

const STORAGE_KEY = "castit_my_castings";

function loadMy(): MyCasting[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveMy(c: MyCasting[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

export default function CastingProPage() {
  const [tab, setTab] = useState<"posts" | "applicants">("posts");
  const [my, setMy] = useState<MyCasting[]>(loadMy);
  const [showNew, setShowNew] = useState(false);

  function add(c: MyCasting) {
    const next = [c, ...my];
    setMy(next);
    saveMy(next);
    setShowNew(false);
    haptic("success");
  }

  // Sample applicants pulled from mock talents
  const applicants = TALENTS.slice(0, 5).map((t, i) => ({
    talent: t,
    castingTitle: CASTINGS[i % CASTINGS.length].title,
    submittedAt: `${i + 1}h ago`,
    matchScore: 95 - i * 7,
  }));

  return (
    <div className="min-h-dvh">
      <Header
        title={<span>Studio <em className="text-gold-gradient not-italic">Hub</em></span>}
        right={
          <button
            onClick={() => { haptic("medium"); setShowNew(true); }}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-gold text-bg text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> Post role
          </button>
        }
      />

      {/* Stats */}
      <div className="px-4 pt-4 grid grid-cols-3 gap-2">
        <Stat label="Open roles" value={my.length} icon={Briefcase} tone="gold" />
        <Stat label="Applicants" value={applicants.length} icon={Users} tone="plum" />
        <Stat label="Profile views" value={284} icon={Eye} tone="sage" />
      </div>

      {/* Tabs */}
      <div className="px-4 pt-5">
        <div className="flex gap-1 p-1 rounded-2xl bg-bg-elevated border border-border">
          <button
            onClick={() => setTab("posts")}
            className={cn("flex-1 h-9 rounded-xl text-xs font-medium transition-all",
              tab === "posts" ? "bg-gold text-bg" : "text-text-muted")}
          >
            My posts
          </button>
          <button
            onClick={() => setTab("applicants")}
            className={cn("flex-1 h-9 rounded-xl text-xs font-medium transition-all",
              tab === "applicants" ? "bg-gold text-bg" : "text-text-muted")}
          >
            Applicants
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-3">
        {tab === "posts" && (
          my.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              tone="gold"
              title="No roles posted yet"
              description="Post a casting and start receiving applications from matching talent."
              ctaLabel="Post your first role"
              ctaOnClick={() => setShowNew(true)}
            />
          ) : (
            my.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-bg-elevated border border-border p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-gold">{c.type}</div>
                    <div className="font-display text-lg leading-tight mt-0.5">{c.title}</div>
                    <div className="flex items-center gap-3 text-[11px] text-text-muted mt-1.5">
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.location}</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.deadline}</span>
                      {c.paid && <span className="text-success font-semibold">PAID</span>}
                    </div>
                  </div>
                  <span className="text-[11px] tnum text-gold font-semibold whitespace-nowrap">
                    {c.applicants} applied
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-2 line-clamp-2">{c.description}</p>
              </motion.div>
            ))
          )
        )}

        {tab === "applicants" && (
          applicants.length === 0 ? (
            <EmptyState
              icon={Users}
              tone="plum"
              title="No applicants yet"
              description="When talent applies to your castings, they'll show up here."
            />
          ) : (
            applicants.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-bg-elevated border border-border"
              >
                <img src={a.talent.photo} alt={a.talent.name} className="w-12 h-12 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{a.talent.name}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                      a.matchScore >= 85 ? "bg-success/15 text-success"
                        : a.matchScore >= 70 ? "bg-gold/15 text-gold"
                        : "bg-bg text-text-muted"
                    )}>
                      {a.matchScore}% match
                    </span>
                  </div>
                  <div className="text-[11px] text-text-muted truncate mt-0.5">
                    Applied to <span className="text-text">{a.castingTitle}</span> · {a.submittedAt}
                  </div>
                </div>
                <Link
                  href={`/profile/${a.talent.username}`}
                  className="h-8 px-3 rounded-full bg-gold text-bg text-xs font-semibold inline-flex items-center"
                >
                  View
                </Link>
              </motion.div>
            ))
          )
        )}
      </div>

      <AnimatePresence>
        {showNew && <NewRoleSheet onClose={() => setShowNew(false)} onSave={add} />}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "gold" | "plum" | "sage" }) {
  const colors = {
    gold: "bg-gold/10 text-gold",
    plum: "bg-plum/15 text-plum-light",
    sage: "bg-sage/15 text-sage",
  }[tone];
  return (
    <div className="rounded-2xl bg-bg-elevated border border-border p-3">
      <div className={cn("w-8 h-8 rounded-lg grid place-items-center mb-2", colors)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xl font-display tnum">{value}</div>
      <div className="text-[10px] text-text-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}

function NewRoleSheet({ onClose, onSave }: { onClose: () => void; onSave: (c: MyCasting) => void }) {
  const [title, setTitle] = useState("");
  const [studio, setStudio] = useState("");
  const [type, setType] = useState("Feature Film");
  const [location, setLocation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [paid, setPaid] = useState(true);
  const [description, setDescription] = useState("");

  const valid = title.length >= 3 && location.length >= 2;

  function submit() {
    if (!valid) return;
    onSave({
      id: crypto.randomUUID(),
      title, studio: studio || "Independent", type, location,
      paid, deadline: deadline || "TBD", description,
      applicants: 0,
    });
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-40" onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed bottom-0 inset-x-0 max-w-[440px] mx-auto z-50 bg-bg-elevated border-t border-border rounded-t-3xl max-h-[88dvh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-bg-elevated p-5 pb-3 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-xl">Post a role</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-bg-muted grid place-items-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <Input label="Title *" value={title} onChange={setTitle} placeholder="Lead Female — 'After the Rain'" />
          <Input label="Studio" value={studio} onChange={setStudio} placeholder="Northwind Pictures" />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Type" value={type} onChange={setType} placeholder="Feature Film" />
            <Input label="Location *" value={location} onChange={setLocation} placeholder="Tel Aviv" />
          </div>
          <Input label="Deadline" value={deadline} onChange={setDeadline} placeholder="Dec 20" />
          <label className="flex items-center gap-2 px-1">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="w-4 h-4 accent-gold" />
            <span className="text-sm">Paid role</span>
          </label>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5 px-1">Description</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Tell talent about the role…"
              className="w-full px-4 py-3 rounded-xl bg-bg border border-border outline-none text-sm focus:border-gold/40 resize-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-bg-elevated p-5 pt-3 border-t border-border">
          <button
            onClick={submit}
            disabled={!valid}
            className={cn("w-full h-12 rounded-2xl font-semibold",
              valid ? "bg-gold text-bg" : "bg-bg text-text-subtle")}
          >
            Publish role
          </button>
        </div>
      </motion.div>
    </>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5 px-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-4 rounded-xl bg-bg border border-border outline-none text-sm focus:border-gold/40"
      />
    </div>
  );
}
