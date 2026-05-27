"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, MessageSquare, Calendar, Mail, ChevronRight, Bot } from "lucide-react";
import { SCENES, NEGOTIATIONS } from "@/lib/mock-data";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const TABS = ["Scene Practice", "AI Agent"] as const;

export default function StudioPage() {
  const [tab, setTab] = useState<typeof TABS[number]>("Scene Practice");

  return (
    <div>
      <Header title="Studio" right={<span className="text-[11px] text-text-muted">Beta</span>} />
      <div className="px-4">
        <div className="flex gap-1 p-1 rounded-2xl bg-bg-elevated border border-border">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 h-9 rounded-xl text-xs font-medium transition-all",
                tab === t ? "bg-gold text-bg" : "text-text-muted"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="px-4 pt-5"
        >
          {tab === "Scene Practice" ? <Scenes /> : <Agent />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Scenes() {
  return (
    <>
      <Link
        href="/studio/coach"
        className="block w-full p-4 rounded-2xl bg-gradient-to-br from-gold/20 via-violet/10 to-bg-elevated border border-gold/30 text-left flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-gold/20 grid place-items-center">
          <Sparkles className="w-5 h-5 text-gold" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Practice with AI Coach</div>
          <div className="text-[11px] text-text-muted">Upload your sides — Aria plays the scene with you.</div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </Link>

      <Link
        href="/studio/upload"
        className="block w-full p-4 mt-2 rounded-2xl bg-bg-elevated border border-border text-left flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-bg grid place-items-center">
          <Plus className="w-5 h-5 text-text-muted" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Upload a reel</div>
          <div className="text-[11px] text-text-muted">Share your latest take with the world.</div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </Link>

      <div className="text-xs uppercase tracking-wider text-text-muted px-1 mt-6 mb-3">Recommended for you</div>

      <div className="space-y-3">
        {SCENES.map((s) => (
          <Link
            key={s.id}
            href={`/studio/scene/${s.id}`}
            className="block rounded-2xl overflow-hidden bg-bg-elevated border border-border"
          >
            <div className="flex gap-3 p-3">
              <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden">
                <img src={s.thumbnail} alt={s.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 grid place-items-center">
                  <div className="w-9 h-9 rounded-full bg-white/95 text-bg grid place-items-center">
                    ▶
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0 py-1">
                <div className="font-display text-base leading-tight">{s.title}</div>
                <div className="text-[11px] text-text-muted mt-0.5">{s.source}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium",
                      s.difficulty === "Advanced" && "bg-danger/15 text-danger",
                      s.difficulty === "Intermediate" && "bg-gold/15 text-gold",
                      s.difficulty === "Beginner" && "bg-success/15 text-success"
                    )}
                  >
                    {s.difficulty}
                  </span>
                  <span className="text-[10px] text-text-muted tnum">{s.duration}</span>
                  <span className="text-[10px] text-text-muted">· {s.characters.length} chars</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function Agent() {
  const seed = useStore((s) => s.profile.avatarSeed) || "Aria";
  return (
    <>
      {/* Agent hero */}
      <Link
        href="/studio/agent"
        className="block rounded-3xl p-5 bg-gradient-to-br from-gold/10 via-violet/10 to-bg-elevated border border-gold/20"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar seed={seed} size={64} />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-bg-elevated" />
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet/15 text-violet text-[10px] font-semibold">
              <Bot className="w-3 h-3" /> AI Agent · Active
            </div>
            <div className="font-display text-2xl leading-tight mt-1">Aria</div>
            <div className="text-[11px] text-text-muted">Your personal casting agent</div>
          </div>
        </div>
        <p className="text-sm text-text mt-4 leading-relaxed">
          "3 new opportunities reviewed today. I scheduled Northwind for 11am and politely passed on the unpaid MV."
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-gold font-semibold">
          Open chat <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </Link>

      <div className="text-xs uppercase tracking-wider text-text-muted px-1 mt-6 mb-3">Active negotiations</div>

      <div className="space-y-2">
        {NEGOTIATIONS.map((n) => (
          <div
            key={n.id}
            className="p-3.5 rounded-2xl bg-bg-elevated border border-border flex items-center gap-3"
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                n.status === "Scheduling" && "bg-gold",
                n.status === "Pending response" && "bg-violet",
                n.status === "Closed" && "bg-text-subtle"
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{n.project}</div>
              <div className="text-[11px] text-text-muted truncate">
                {n.studio} · {n.status}
                {n.proposedDate && ` · ${n.proposedDate}`}
              </div>
            </div>
            {n.fee && <div className="text-[10px] text-gold font-semibold whitespace-nowrap">{n.fee}</div>}
          </div>
        ))}
      </div>

      <div className="text-xs uppercase tracking-wider text-text-muted px-1 mt-6 mb-3">Integrations</div>
      <div className="grid grid-cols-2 gap-3">
        <IntegrationButton icon={Mail} label="Connect Gmail" />
        <IntegrationButton icon={Calendar} label="Connect Calendar" />
      </div>
    </>
  );
}

function IntegrationButton({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <button className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-bg-elevated border border-border hover:border-border-strong">
      <Icon className="w-4 h-4 text-text-muted" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
