"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Inbox, Clock, AlertTriangle, PlayCircle, Send, ChevronLeft,
  Calendar as CalendarIcon, Sparkles, Filter, Zap,
} from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import {
  loadInbox, type InboxItem,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";

const REASON_META: Record<InboxItem["reason"], {
  label: string;
  icon: typeof Inbox;
  tone: "danger" | "gold" | "plum" | "sage" | "violet";
}> = {
  hold_expired:    { label: "Hold פג",            icon: AlertTriangle, tone: "danger" },
  deadline_passed: { label: "דדליין עבר",         icon: AlertTriangle, tone: "danger" },
  hold_expiring:   { label: "Hold פג ב-24ש",      icon: Clock,         tone: "gold" },
  deadline_today:  { label: "דדליין היום",        icon: Clock,         tone: "gold" },
  to_review:       { label: "טייפ לסקירה",        icon: PlayCircle,    tone: "plum" },
  avail_waiting:   { label: "מחכה ל-Avail",       icon: CalendarIcon,  tone: "violet" },
  offer_pending:   { label: "Offer ממתין",        icon: Send,          tone: "sage" },
};

const TONE_CLS: Record<string, string> = {
  danger:  "bg-danger/15 text-danger border-danger/30",
  gold:    "bg-gold/15 text-gold border-gold/30",
  plum:    "bg-plum/15 text-plum-light border-plum/30",
  sage:    "bg-sage/15 text-sage border-sage/30",
  violet:  "bg-violet/15 text-violet border-violet/30",
};

function formatUrgency(reason: InboxItem["reason"], ms?: number): string {
  if (!ms) return "";
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600_000);
  const d = Math.floor(h / 24);
  if (reason === "hold_expired" || reason === "deadline_passed") {
    if (d >= 1) return `לפני ${d} ימים`;
    if (h >= 1) return `לפני ${h} שעות`;
    return "לפני רגעים";
  }
  if (reason === "hold_expiring" || reason === "deadline_today") {
    if (h <= 1) return "פג בשעה הקרובה";
    return `נשאר ${h} שעות`;
  }
  // for to_review etc — "waited X time"
  if (d >= 1) return `${d} ימים`;
  if (h >= 1) return `${h} שעות`;
  return "חדש";
}

export default function ProInboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<"all" | "urgent" | "review">("all");

  useEffect(() => {
    setItems(loadInbox());
    setLoaded(true);
  }, []);

  const filtered = useMemo(() => {
    if (filter === "urgent") {
      return items.filter((i) =>
        i.reason === "hold_expired" ||
        i.reason === "deadline_passed" ||
        i.reason === "hold_expiring" ||
        i.reason === "deadline_today"
      );
    }
    if (filter === "review") {
      return items.filter((i) => i.reason === "to_review");
    }
    return items;
  }, [items, filter]);

  const counts = useMemo(() => ({
    all: items.length,
    urgent: items.filter((i) =>
      i.reason === "hold_expired" ||
      i.reason === "deadline_passed" ||
      i.reason === "hold_expiring" ||
      i.reason === "deadline_today"
    ).length,
    review: items.filter((i) => i.reason === "to_review").length,
  }), [items]);

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header
        back
        title={`Action Inbox (${counts.all})`}
        right={counts.review > 0 && (
          <Link
            href="/pro/triage"
            className="text-[11px] text-gold font-semibold inline-flex items-center gap-1"
          >
            <Zap className="w-3 h-3" /> Triage
          </Link>
        )}
      />

      {/* Filter pills */}
      <div className="px-4 mt-2 flex gap-1.5">
        {([
          { k: "all" as const, label: "הכל", n: counts.all },
          { k: "urgent" as const, label: "דחוף", n: counts.urgent },
          { k: "review" as const, label: "לסקירה", n: counts.review },
        ]).map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={cn(
              "px-3 h-8 rounded-full text-xs font-semibold transition",
              filter === f.k
                ? "bg-gold text-bg"
                : "bg-bg-elevated border border-border text-text-muted"
            )}
          >
            {f.label} <span className="tnum opacity-70">{f.n}</span>
          </button>
        ))}
      </div>

      {loaded && filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          tone="gold"
          title={items.length === 0 ? "תיבת הפעולות ריקה" : "אין פריטים בקטגוריה זו"}
          description={items.length === 0
            ? "כשיגיעו טייפים לסקירה, יפוגו holds, או יוצעו offers — תראה אותם כאן."
            : "נסה פילטר אחר."}
          ctaLabel="חזור לדשבורד"
          ctaHref="/pro/dashboard"
        />
      ) : (
        <div className="px-4 pt-4 space-y-2">
          {filtered.map((item, i) => {
            const meta = REASON_META[item.reason];
            const Icon = meta.icon;
            const cls = TONE_CLS[meta.tone];
            const href = `/pro/projects/${item.project.id}/role/${item.role.id}/submission/${item.submission.id}`;
            return (
              <motion.div
                key={item.submission.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={href}
                  className="block rounded-2xl bg-bg-elevated border border-border overflow-hidden hover:border-gold/30 transition"
                >
                  <div className="flex items-center gap-3 p-3">
                    <img
                      src={item.submission.talentPhoto}
                      alt={item.submission.talentName}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full border font-semibold whitespace-nowrap", cls)}>
                          <Icon className="w-2.5 h-2.5" /> {meta.label}
                        </span>
                        <span className="text-[10px] text-text-subtle tnum">
                          {formatUrgency(item.reason, item.urgencyMs)}
                        </span>
                      </div>
                      <div className="text-sm font-semibold mt-1 truncate">
                        {item.submission.talentName}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5 truncate">
                        {item.project.title} · {item.role.name}
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-text-muted shrink-0" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
