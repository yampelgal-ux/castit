"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Megaphone, Users, Eye, Plus, Briefcase, ArrowRight, Clock, MapPin, PlayCircle, Bookmark, Wand2, Rocket } from "lucide-react";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { useStore } from "@/lib/store";
import { loadAuditions } from "@/lib/auditions-store";
import { TALENTS, type Audition } from "@/lib/mock-data";
import { matchTalent } from "@/lib/matching";
import { cn } from "@/lib/utils";

export default function ProDashboardPage() {
  const { profile } = useStore();
  const [auditions, setAuditions] = useState<Audition[]>([]);

  useEffect(() => { setAuditions(loadAuditions()); }, []);

  const stats = useMemo(() => {
    const totalApps = auditions.reduce((s, a) => s + a.applicants, 0);
    return {
      open: auditions.length,
      applicants: totalApps,
      views: 284 + auditions.length * 18,
    };
  }, [auditions]);

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header
        title={
          <span className="flex items-center gap-2">
            <span className="font-display text-lg">Studio</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-plum/20 text-plum-light font-semibold tracking-wider">PRO</span>
          </span>
        }
        right={
          <Link href="/profile/me" className="flex items-center gap-2">
            <Avatar seed={profile.avatarSeed || "pro"} size={28} />
          </Link>
        }
      />

      <div className="px-5 pt-3 space-y-5">
        {/* Greeting */}
        <div>
          <h1 className="font-display text-3xl tracking-editorial">
            Good to see you, <em className="text-gold-gradient not-italic">{profile.name?.split(" ")[0] || "there"}</em>.
          </h1>
          <p className="text-text-muted text-sm mt-1">Cast your next role.</p>
        </div>

        {/* Hero: Discover reels */}
        <Link
          href="/pro/reels"
          className="block rounded-3xl p-5 bg-gradient-to-br from-wine/30 via-plum/20 to-bg-elevated border border-gold/20 relative overflow-hidden"
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gold/15 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gold/20 grid place-items-center shrink-0">
              <PlayCircle className="w-7 h-7 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">New today</div>
              <div className="font-display text-xl leading-tight mt-0.5">Discover talent in motion</div>
              <div className="text-[11px] text-text-muted mt-0.5">Swipe through reels — shortlist, invite, message.</div>
            </div>
            <ArrowRight className="w-4 h-4 text-gold shrink-0" />
          </div>
        </Link>

        {/* AI Sourcing hero — describe the role in plain English */}
        <Link
          href="/pro/sourcing"
          className="block rounded-2xl p-4 bg-gradient-to-br from-violet/20 via-plum/15 to-bg-elevated border border-violet/40 relative overflow-hidden group"
        >
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-violet/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet/25 grid place-items-center shrink-0">
              <Wand2 className="w-5 h-5 text-violet" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-violet font-semibold">AI Sourcing</div>
              <div className="font-display text-base leading-tight mt-0.5">Describe the role. Aria finds them.</div>
              <div className="text-[10px] text-text-muted mt-0.5">Skip filters — write a brief, get ranked talent.</div>
            </div>
            <ArrowRight className="w-4 h-4 text-violet shrink-0" />
          </div>
        </Link>

        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/pro/search"
            className="rounded-2xl p-4 bg-gradient-to-br from-gold/15 to-bg-elevated border border-gold/30 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gold/20 grid place-items-center mb-2.5">
              <Search className="w-5 h-5 text-gold" />
            </div>
            <div className="text-sm font-semibold">Search talent</div>
            <div className="text-[10px] text-text-muted mt-0.5">Filter by typecast</div>
          </Link>

          <Link
            href="/pro/audition/new"
            className="rounded-2xl p-4 bg-gradient-to-br from-plum/20 to-bg-elevated border border-plum-light/30"
          >
            <div className="w-10 h-10 rounded-xl bg-plum/30 grid place-items-center mb-2.5">
              <Megaphone className="w-5 h-5 text-plum-light" />
            </div>
            <div className="text-sm font-semibold">Post audition</div>
            <div className="text-[10px] text-text-muted mt-0.5">Open call or targeted</div>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={Briefcase} label="Open" value={stats.open} tone="gold" />
          <Stat icon={Users} label="Applicants" value={stats.applicants} tone="plum" />
          <Stat icon={Eye} label="Views" value={stats.views} tone="sage" />
        </div>

        {/* Shortlist link */}
        <Link
          href="/pro/shortlist"
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-bg-elevated border border-border hover:border-border-strong"
        >
          <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold grid place-items-center">
            <Bookmark className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Your shortlist</div>
            <div className="text-[11px] text-text-muted">Talent you saved while browsing reels</div>
          </div>
          <ArrowRight className="w-4 h-4 text-text-muted" />
        </Link>

        {/* Live auditions */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs uppercase tracking-widest text-text-muted">Your auditions</h2>
            <Link href="/pro/audition/new" className="text-[11px] text-gold font-semibold inline-flex items-center gap-1">
              <Plus className="w-3 h-3" /> New
            </Link>
          </div>

          {auditions.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              tone="gold"
              title="Post your first audition"
              description="Reach the entire talent pool — or only profiles that match your brief."
              ctaLabel="Create one"
              ctaHref="/pro/audition/new"
            />
          ) : (
            <div className="space-y-2.5">
              {auditions.map((a, i) => <AuditionCard key={a.id} a={a} i={i} />)}
            </div>
          )}
        </section>

        {/* Inspiration: top matches */}
        {auditions.length > 0 && <TopMatchesPanel a={auditions[0]} />}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "gold" | "plum" | "sage" }) {
  const colors = {
    gold: "bg-gold/10 text-gold",
    plum: "bg-plum/20 text-plum-light",
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

function AuditionCard({ a, i }: { a: Audition; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
    >
      <Link href={`/pro/audition/${a.id}`} className="block rounded-2xl bg-bg-elevated border border-border p-4 hover:border-border-strong">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-gold">{a.type}</div>
            <div className="font-display text-lg leading-tight mt-0.5 truncate">{a.title}</div>
            <div className="flex items-center gap-3 text-[11px] text-text-muted mt-1.5">
              <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.location}</span>
              <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {a.deadline}</span>
              {a.paid && <span className="text-success font-semibold">PAID</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-lg tnum text-gold">{a.applicants}</div>
            <div className="text-[9px] uppercase tracking-wider text-text-muted">applied</div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function TopMatchesPanel({ a }: { a: Audition }) {
  const matches = TALENTS
    .map((t) => ({ t, m: matchTalent(t, a.targetTypecast) }))
    .filter((r) => r.m.passes)
    .sort((x, y) => y.m.score - x.m.score)
    .slice(0, 4);

  if (matches.length === 0) return null;

  return (
    <section className="rounded-2xl bg-gold/8 border border-gold/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">Top matches</div>
          <p className="text-[11px] text-text-muted mt-0.5 truncate">for {a.title}</p>
        </div>
        <Link href="/pro/search" className="text-[11px] text-gold font-semibold inline-flex items-center gap-1">
          See all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {matches.map(({ t, m }) => (
          <Link
            key={t.id}
            href={`/profile/${t.username}`}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-elevated border border-border"
          >
            <img src={t.photo} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{t.name}</div>
              <div className="text-[10px] text-text-muted truncate">
                {t.typecast.gender} · {t.typecast.ageRange[0]}–{t.typecast.ageRange[1]} · {t.typecast.location}
              </div>
            </div>
            <span className="text-[10px] tnum font-semibold px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 whitespace-nowrap">
              {m.score}%
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
