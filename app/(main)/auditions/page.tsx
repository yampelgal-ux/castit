"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Megaphone, MapPin, Clock, DollarSign, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { useT } from "@/lib/i18n";
import { optLabel } from "@/lib/typecast-options";
import { listOpenCalls, type OpenCall } from "@/lib/cloud/invites";
import { isCloudConfigured } from "@/lib/cloud/config";
import { cn } from "@/lib/utils";

const FILTERS = [["all", "הכל", "All"], ["paid", "בתשלום", "Paid"], ["new", "לא הגשתי", "Not applied"]] as const;

// Open auditions every actor can apply to. Casting directors list a role here
// from the role screen; applying adds the actor to that role like an invite.
export default function AuditionsPage() {
  const { lang } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const [calls, setCalls] = useState<OpenCall[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");

  useEffect(() => {
    if (!isCloudConfigured()) { setCalls([]); return; }
    listOpenCalls().then((c) => setCalls(c ?? []));
  }, []);

  const shown = useMemo(() => (calls ?? []).filter((c) =>
    filter === "paid" ? !!c.data.role.payRange : filter === "new" ? !c.applied : true), [calls, filter]);

  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleDateString(he ? "he-IL" : "en-US", { day: "numeric", month: "short" }) : "";

  return (
    <div className="min-h-dvh pb-8">
      <Header back
        title={he ? <span>אודישנים <em className="text-gold-gradient not-italic">פתוחים</em></span> : <span>Open <em className="text-gold-gradient not-italic">auditions</em></span>}
      />

      <div className="px-4 pt-2">
        <div className="flex gap-1 p-1 rounded-2xl bg-bg-elevated border border-border">
          {FILTERS.map(([id, h, e]) => (
            <button key={id} onClick={() => setFilter(id)} aria-pressed={filter === id}
              className={cn("flex-1 h-9 rounded-xl text-xs font-medium transition-all", filter === id ? "bg-gold text-on-accent" : "text-text-muted")}>
              {L(h, e)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2.5">
        {calls === null ? (
          <p className="text-sm text-text-muted text-center py-10">{L("טוען…", "Loading…")}</p>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            tone="gold"
            title={calls.length ? L("אין כאן כרגע", "Nothing here right now") : L("עוד אין אודישנים פתוחים", "No open auditions yet")}
            description={L("כשמלהקים מפרסמים אודישן פתוח הוא יופיע כאן. בינתיים כדאי להשלים את הפרופיל כדי שימצאו אותך בחיפוש.",
              "When casting directors post an open audition it shows up here. Meanwhile, complete your profile so they find you in search.")}
            ctaLabel={L("עריכת הטייפקאסט", "Edit my typecast")}
            ctaHref="/typecast"
          />
        ) : (
          shown.map((c, i) => {
            const d = c.data;
            return (
              <motion.div key={c.code} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}
                className="rounded-2xl bg-bg-elevated border border-border overflow-hidden">
                <Link href={`/auditions/${c.code}`} className="block p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {d.project?.type && <div className="text-[0.6875rem] uppercase tracking-widest text-gold">{optLabel(d.project.type, he)}</div>}
                      <h3 className="font-display text-lg leading-tight mt-0.5">{d.role.name}</h3>
                      <p className="text-[0.6875rem] text-text-muted mt-0.5 truncate">{[d.project?.title, d.studio || d.proName].filter(Boolean).join(" · ")}</p>
                    </div>
                    {c.applied && (
                      <span className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30 whitespace-nowrap inline-flex items-center gap-1">
                        <Check className="w-3 h-3" aria-hidden /> {L("הגשת", "Applied")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-[0.6875rem] text-text-muted mt-3">
                    {d.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden /> {d.location}</span>}
                    {d.role.deadline && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden /> {L("עד", "by")} {fmt(d.role.deadline)}</span>}
                    {d.role.payRange && <span className="inline-flex items-center gap-1 text-success font-semibold"><DollarSign className="w-3 h-3" aria-hidden /> {d.role.payRange}</span>}
                  </div>
                  {d.role.description && <p className="text-xs text-text mt-3 leading-relaxed line-clamp-2" dir="auto">{d.role.description}</p>}
                </Link>
              </motion.div>
            );
          })
        )}
        <p className="text-[0.6875rem] text-text-subtle text-center pt-2">{L("רק מלהקים שאושרו ידנית יכולים לפרסם כאן. אודישן אמיתי לא עולה כסף.", "Only casting directors we approved by hand can post here. A real audition never costs money.")}</p>
      </div>
    </div>
  );
}
