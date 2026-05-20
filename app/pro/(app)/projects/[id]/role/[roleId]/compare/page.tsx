"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, X, FileVideo, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { StageBadge } from "@/components/StageBadge";
import { getRole, getSubmissionsByRole, type Submission, type Role } from "@/lib/projects-store";
import { cn } from "@/lib/utils";

// Optional side-by-side compare view for a role.
// Pro picks 2–4 submissions to see their tapes & details next to each other.
export default function ComparePage() {
  const { id, roleId } = useParams<{ id: string; roleId: string }>();
  const [role, setRole] = useState<Role | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    setRole(getRole(roleId) ?? null);
    setSubs(getSubmissionsByRole(roleId));
  }, [roleId]);

  const compared = useMemo(
    () => subs.filter((s) => picked.includes(s.id)),
    [subs, picked]
  );

  function toggle(id: string) {
    if (picked.includes(id)) setPicked(picked.filter((x) => x !== id));
    else if (picked.length < 4) setPicked([...picked, id]);
  }

  if (!role) {
    return (
      <div className="min-h-dvh bg-bg">
        <Header back title="Compare" />
        <EmptyState icon={Users} title="Not found" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header
        back
        title="Compare"
        right={picked.length > 0 && (
          <button onClick={() => setPicked([])} className="text-[11px] text-text-muted underline">Clear</button>
        )}
      />

      <div className="px-5 pt-3 space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-gold">Side-by-side</div>
          <h1 className="font-display text-2xl tracking-editorial leading-tight">{role.name}</h1>
          <p className="text-text-muted text-sm mt-1">
            Pick 2–4 tapes to compare them next to each other.
          </p>
        </div>

        {subs.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No submissions yet"
            description="Once tapes start coming in, you can compare them here."
          />
        ) : (
          <>
            {/* Picker */}
            <div className="rounded-2xl border border-border bg-bg-elevated p-3">
              <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2 px-1">
                Tap to add ({picked.length}/4)
              </div>
              <div className="space-y-1.5 max-h-[35dvh] overflow-y-auto">
                {subs.map((s) => {
                  const on = picked.includes(s.id);
                  const disabled = !on && picked.length >= 4;
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      disabled={disabled}
                      className={cn(
                        "w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all",
                        on ? "border-gold bg-gold/10" : "border-border bg-bg",
                        disabled ? "opacity-40" : ""
                      )}
                    >
                      <img src={s.talentPhoto} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{s.talentName}</div>
                        <div className="text-[10px] text-text-muted truncate">
                          {s.tapes.length > 0 ? `${s.tapes.length} tape${s.tapes.length > 1 ? "s" : ""}` : "no tape"}
                        </div>
                      </div>
                      <StageBadge stage={s.stage} />
                      {on && <Check className="w-4 h-4 text-gold shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compare grid */}
            {compared.length >= 2 && (
              <div className="-mx-5 px-5 overflow-x-auto no-scrollbar">
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${compared.length}, minmax(240px, 1fr))`,
                  }}
                >
                  {compared.map((s, i) => <CompareCard key={s.id} s={s} i={i} onRemove={() => toggle(s.id)} />)}
                </div>
              </div>
            )}

            {compared.length < 2 && (
              <div className="rounded-2xl border border-dashed border-border bg-bg-elevated p-5 text-center">
                <Users className="w-8 h-8 text-text-muted mx-auto opacity-50" />
                <p className="text-sm text-text-muted mt-2">Pick at least 2 talents above.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CompareCard({ s, i, onRemove }: { s: Submission; i: number; onRemove: () => void }) {
  const latest = s.tapes[s.tapes.length - 1];
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.06 }}
      className="rounded-2xl bg-bg-elevated border border-border overflow-hidden"
    >
      <div className="aspect-[9/16] bg-black relative">
        {latest?.videoUrl ? (
          <video src={latest.videoUrl} controls playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-text-muted">
            <FileVideo className="w-8 h-8" />
          </div>
        )}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 grid place-items-center text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <img src={s.talentPhoto} alt="" className="w-7 h-7 rounded-full object-cover" />
          <span className="text-sm font-semibold truncate flex-1">{s.talentName}</span>
        </div>
        <StageBadge stage={s.stage} />
        {s.tapes.length > 1 && (
          <div className="text-[10px] text-text-muted">{s.tapes.length} rounds</div>
        )}
      </div>
    </motion.div>
  );
}
