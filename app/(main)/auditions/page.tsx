"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Megaphone, MapPin, Clock, DollarSign, Sparkles, Filter } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { useStore } from "@/lib/store";
import { TALENTS, type Audition, type Talent } from "@/lib/mock-data";
import { matchTalent } from "@/lib/matching";
import { loadAuditions } from "@/lib/auditions-store";
import { cn } from "@/lib/utils";

const FILTERS = ["For You", "All", "Paid", "Local"] as const;

export default function AuditionsPage() {
  const { profile, userId } = useStore();
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("For You");

  useEffect(() => { setAuditions(loadAuditions()); }, []);

  // Build a "me" talent from store profile for matching
  const me: Talent = useMemo(() => ({
    id: userId ?? "me",
    username: profile.username || "you",
    name: profile.name || "You",
    verified: false,
    photo: "",
    cover: "",
    bio: "",
    followers: 0,
    likes: 0,
    submissions: 0,
    typecast: {
      heightCm: profile.typecast.heightCm ?? 175,
      weightKg: profile.typecast.weightKg ?? 65,
      ageRange: [profile.typecast.ageRangeMin ?? 22, profile.typecast.ageRangeMax ?? 35],
      gender: (profile.typecast.gender as any) ?? "Female",
      ethnicity: "",
      skinTone: profile.typecast.skinTone ?? "#EBC8A7",
      eyeColor: profile.typecast.eyeColor ?? "#6B8E4E",
      hairColor: profile.typecast.hairColor ?? "#3B2A1E",
      hairLength: (profile.typecast.hairLength as any) ?? "Medium",
      languages: profile.typecast.languages ?? ["English"],
      skills: profile.typecast.skills ?? [],
      genres: profile.typecast.genres ?? [],
      location: "Tel Aviv",
      willingToTravel: true,
    },
  }), [profile, userId]);

  const ranked = useMemo(() => {
    let list = auditions.map((a) => ({ a, m: matchTalent(me, a.targetTypecast) }));

    if (filter === "Paid")  list = list.filter((r) => r.a.paid);
    if (filter === "Local") list = list.filter((r) => r.a.location.toLowerCase().includes((me.typecast.location ?? "").toLowerCase()));
    if (filter === "For You") {
      list = list
        .filter((r) => r.m.passes)
        .sort((x, y) => y.m.score - x.m.score);
    } else {
      list.sort((x, y) => new Date(y.a.createdAt).getTime() - new Date(x.a.createdAt).getTime());
    }
    return list;
  }, [auditions, filter, me]);

  return (
    <div className="min-h-dvh pb-8">
      <Header
        title={<span>Open <em className="text-gold-gradient not-italic">auditions</em></span>}
      />

      <div className="px-4 pt-2">
        <div className="flex gap-1 p-1 rounded-2xl bg-bg-elevated border border-border">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 h-9 rounded-xl text-xs font-medium transition-all",
                filter === f ? "bg-gold text-bg" : "text-text-muted"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2.5">
        {ranked.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            tone="gold"
            title="Nothing matches you — yet"
            description={filter === "For You"
              ? "Complete your typecast so casting pros can find you when they post new auditions."
              : "Check back soon — new auditions drop daily."}
            ctaLabel="Edit my typecast"
            ctaHref="/profile/me"
          />
        ) : (
          ranked.map(({ a, m }, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl bg-bg-elevated border border-border overflow-hidden"
            >
              <Link href={`/auditions/${a.id}`} className="block p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-gold">{a.type}</div>
                    <h3 className="font-display text-lg leading-tight mt-0.5">{a.title}</h3>
                    <p className="text-[11px] text-text-muted mt-0.5">{a.studio}</p>
                  </div>
                  {filter === "For You" && m.passes && (
                    <span className={cn(
                      "text-[10px] tnum font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap",
                      m.score >= 85 ? "bg-success/15 text-success border-success/30"
                        : m.score >= 65 ? "bg-gold/15 text-gold border-gold/30"
                        : "bg-bg text-text-muted border-border"
                    )}>
                      <Sparkles className="w-2.5 h-2.5 inline mr-0.5" /> {m.score}%
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-[11px] text-text-muted mt-3">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.location}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> by {a.deadline}</span>
                  {a.paid && (
                    <span className="inline-flex items-center gap-1 text-success font-semibold">
                      <DollarSign className="w-3 h-3" /> {a.fee || "Paid"}
                    </span>
                  )}
                </div>

                <p className="text-xs text-text mt-3 leading-relaxed line-clamp-2">{a.description}</p>
              </Link>
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-bg/40">
                <span className="text-[11px] text-text-muted tnum">{a.applicants} applied</span>
                <Link
                  href={`/auditions/${a.id}`}
                  className="h-8 px-4 rounded-full bg-gold text-bg text-xs font-semibold inline-flex items-center"
                >
                  View
                </Link>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
