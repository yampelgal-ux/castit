"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar as CalIcon, Clock, Film, CheckCircle2, AlertTriangle } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { StageBadge } from "@/components/StageBadge";
import {
  loadProjects, loadRoles, loadSubmissions,
  type Project, type Role, type Submission,
} from "@/lib/projects-store";
import { cn } from "@/lib/utils";

type Event = {
  date: Date;
  kind: "deadline" | "shoot" | "callback" | "booked";
  title: string;
  subtitle: string;
  href: string;
  urgent?: boolean;
};

// Optional planning view — pulls deadlines, shoot dates, callbacks, bookings.
export default function ProCalendarPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);

  useEffect(() => {
    setProjects(loadProjects());
    setRoles(loadRoles());
    setSubs(loadSubmissions());
  }, []);

  const events: Event[] = useMemo(() => {
    const out: Event[] = [];
    const projById: Record<string, Project> = Object.fromEntries(projects.map((p) => [p.id, p]));
    const roleById: Record<string, Role> = Object.fromEntries(roles.map((r) => [r.id, r]));

    // Role deadlines + shoot dates
    roles.forEach((r) => {
      const p = projById[r.projectId];
      if (!p) return;
      if (r.deadline) {
        const d = new Date(r.deadline);
        if (!isNaN(+d)) {
          out.push({
            date: d,
            kind: "deadline",
            title: `Tape due — ${r.name}`,
            subtitle: p.title,
            href: `/pro/projects/${p.id}/role/${r.id}`,
            urgent: d.getTime() - Date.now() < 86400000 * 3,
          });
        }
      }
      // shootDates can be free-form; try to parse start date if it looks ISO-ish
      if (r.shootDates) {
        const isoMatch = r.shootDates.match(/\d{4}-\d{2}-\d{2}/);
        const d = isoMatch ? new Date(isoMatch[0]) : null;
        if (d && !isNaN(+d)) {
          out.push({
            date: d,
            kind: "shoot",
            title: `Shoot — ${r.name}`,
            subtitle: `${p.title} · ${r.shootDates}`,
            href: `/pro/projects/${p.id}/role/${r.id}`,
          });
        }
      }
    });

    // Callbacks + bookings — pinned to decidedAt for ordering
    subs.forEach((s) => {
      const r = roleById[s.roleId];
      const p = r ? projById[r.projectId] : null;
      if (!p || !r) return;
      if (s.stage === "callback" && s.decidedAt) {
        out.push({
          date: new Date(s.decidedAt),
          kind: "callback",
          title: `Callback — ${s.talentName}`,
          subtitle: `${r.name} · ${p.title}`,
          href: `/pro/projects/${p.id}/role/${r.id}/submission/${s.id}`,
        });
      }
      if (s.stage === "booked" && s.decidedAt) {
        out.push({
          date: new Date(s.decidedAt),
          kind: "booked",
          title: `Booked — ${s.talentName}`,
          subtitle: `${r.name} · ${p.title}`,
          href: `/pro/projects/${p.id}/role/${r.id}/submission/${s.id}`,
        });
      }
    });

    return out.sort((a, b) => +a.date - +b.date);
  }, [projects, roles, subs]);

  // Group by date label
  const grouped = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach((e) => {
      const key = e.date.toDateString();
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    });
    return [...map.entries()];
  }, [events]);

  const upcoming = events.filter((e) => +e.date >= Date.now() - 86400000).length;

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header back title="Calendar" />

      <div className="px-5 pt-3 space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-gold">Optional</div>
          <h1 className="font-display text-3xl tracking-editorial">Your schedule</h1>
          <p className="text-text-muted text-sm mt-1">
            Deadlines, shoots, callbacks and bookings — auto-pulled from your projects.
          </p>
        </div>

        {events.length === 0 ? (
          <EmptyState
            icon={CalIcon}
            title="Nothing scheduled"
            description="Add tape deadlines or shoot dates to your roles — they'll appear here automatically."
          />
        ) : (
          <>
            <div className="rounded-2xl bg-gold/8 border border-gold/20 p-3 text-[11px] text-gold">
              <strong className="tnum">{upcoming}</strong> upcoming · {events.length} total
            </div>
            <div className="space-y-4">
              {grouped.map(([day, evs]) => (
                <DayGroup key={day} day={day} events={evs} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DayGroup({ day, events }: { day: string; events: Event[] }) {
  const d = new Date(day);
  const isToday = d.toDateString() === new Date().toDateString();
  const isPast = +d < Date.now() - 86400000;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className={cn(
          "text-xs font-semibold uppercase tracking-wider",
          isToday ? "text-gold" : isPast ? "text-text-subtle" : "text-text-muted"
        )}>
          {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          {isToday && " · Today"}
        </div>
      </div>
      <div className="space-y-1.5">
        {events.map((e, i) => <EventRow key={`${e.title}-${i}`} e={e} i={i} />)}
      </div>
    </div>
  );
}

function EventRow({ e, i }: { e: Event; i: number }) {
  const tone = {
    deadline: { icon: Clock,         cls: "bg-gold/10 text-gold border-gold/30" },
    shoot:    { icon: Film,          cls: "bg-violet/15 text-violet border-violet/30" },
    callback: { icon: CheckCircle2,  cls: "bg-success/10 text-success border-success/30" },
    booked:   { icon: CheckCircle2,  cls: "bg-success/15 text-success border-success/40" },
  }[e.kind];
  const Icon = tone.icon;
  return (
    <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
      <Link href={e.href} className={cn("flex items-center gap-2.5 p-2.5 rounded-xl border", tone.cls)}>
        <Icon className="w-4 h-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{e.title}</div>
          <div className="text-[10px] opacity-80 truncate">{e.subtitle}</div>
        </div>
        {e.urgent && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
      </Link>
    </motion.div>
  );
}
