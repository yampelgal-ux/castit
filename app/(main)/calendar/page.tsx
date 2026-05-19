"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Header } from "@/components/Header";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type Block = { date: string; status: "busy" | "available"; reason?: string };

const STORAGE_KEY = "castit_calendar_blocks";

function loadBlocks(): Block[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveBlocks(blocks: Block[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["S","M","T","W","T","F","S"];

function iso(d: Date) { return d.toISOString().slice(0, 10); }

export default function CalendarPage() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [blocks, setBlocks] = useState<Block[]>(loadBlocks);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const grid = useMemo(() => {
    const firstDay = cursor.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    return cells;
  }, [cursor]);

  function blockFor(d: Date | null) {
    if (!d) return undefined;
    return blocks.find((b) => b.date === iso(d));
  }

  function toggle(d: Date) {
    haptic("light");
    setSelected(iso(d));
    const existing = blocks.find((b) => b.date === iso(d));
    setReason(existing?.reason ?? "");
  }

  function save(status: "busy" | "available") {
    if (!selected) return;
    const next = blocks.filter((b) => b.date !== selected);
    next.push({ date: selected, status, reason });
    setBlocks(next);
    saveBlocks(next);
    setSelected(null);
    setReason("");
    haptic("success");
  }

  function clear() {
    if (!selected) return;
    const next = blocks.filter((b) => b.date !== selected);
    setBlocks(next);
    saveBlocks(next);
    setSelected(null);
    setReason("");
    haptic("light");
  }

  function shift(delta: number) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    haptic("light");
  }

  const busyCount = blocks.filter((b) => b.status === "busy").length;
  const availCount = blocks.filter((b) => b.status === "available").length;

  return (
    <div className="min-h-dvh">
      <Header back title="Availability" />

      <div className="px-5 pt-4">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => shift(-1)} className="w-10 h-10 rounded-full bg-bg-elevated border border-border grid place-items-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <div className="font-display text-xl tracking-editorial">{MONTHS[cursor.getMonth()]}</div>
            <div className="text-[10px] uppercase tracking-widest text-text-muted">{cursor.getFullYear()}</div>
          </div>
          <button onClick={() => shift(1)} className="w-10 h-10 rounded-full bg-bg-elevated border border-border grid place-items-center">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {DOW.map((d, i) => (
            <div key={i} className="text-center text-[10px] uppercase tracking-wider text-text-subtle">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {grid.map((d, i) => {
            if (!d) return <div key={i} />;
            const b = blockFor(d);
            const isToday = iso(d) === iso(today);
            const isSelected = iso(d) === selected;
            return (
              <button
                key={i}
                onClick={() => toggle(d)}
                className={cn(
                  "aspect-square rounded-xl text-sm font-medium transition-all relative",
                  isSelected
                    ? "bg-gold text-bg ring-2 ring-gold/40"
                    : b?.status === "busy"
                    ? "bg-terra/15 text-terra border border-terra/30"
                    : b?.status === "available"
                    ? "bg-sage/15 text-sage border border-sage/30"
                    : "bg-bg-elevated border border-border text-text hover:border-border-strong"
                )}
              >
                {d.getDate()}
                {isToday && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-5 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-terra/40 border border-terra/60" /> Busy ({busyCount})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sage/40 border border-sage/60" /> Available ({availCount})
          </span>
        </div>
      </div>

      {/* Edit sheet */}
      {selected && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-20 inset-x-0 mx-auto max-w-[420px] px-4 z-40"
        >
          <div className="rounded-3xl bg-bg-elevated border border-border p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-muted">Selected</div>
                <div className="font-display text-lg">{new Date(selected).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-bg grid place-items-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional) — e.g. Self-tape day"
              className="w-full h-11 px-4 rounded-xl bg-bg border border-border outline-none text-sm focus:border-gold/40"
            />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => save("busy")} className="h-11 rounded-xl bg-terra/15 text-terra font-semibold text-xs border border-terra/30">
                Mark busy
              </button>
              <button onClick={() => save("available")} className="h-11 rounded-xl bg-sage/15 text-sage font-semibold text-xs border border-sage/30">
                Mark available
              </button>
            </div>
            {blockFor(new Date(selected)) && (
              <button onClick={clear} className="w-full mt-2 text-[11px] text-text-muted underline">
                Clear this day
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
