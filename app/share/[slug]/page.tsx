"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Film, ChevronRight, AlertCircle } from "lucide-react";
import { getPacketBySlug, logView, isExpired, type SharePacket } from "@/lib/share-store";
import { TALENTS, REELS, type Talent } from "@/lib/mock-data";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export default function SharePage() {
  const { slug } = useParams<{ slug: string }>();
  const [packet, setPacket] = useState<SharePacket | null | undefined>(undefined);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const p = getPacketBySlug(slug);
    setPacket(p ?? null);
    if (p) logView(slug);
  }, [slug]);

  if (packet === undefined) {
    return <div className="min-h-dvh bg-bg" />;
  }

  if (!packet) {
    return (
      <div className="min-h-dvh bg-bg grid place-items-center p-6 text-center">
        <div>
          <AlertCircle className="w-10 h-10 text-text-subtle mx-auto opacity-60" />
          <h1 className="font-display text-2xl mt-4">Link not found</h1>
          <p className="text-sm text-text-muted mt-1">This shortlist may have been removed.</p>
        </div>
      </div>
    );
  }

  if (isExpired(packet)) {
    return (
      <div className="min-h-dvh bg-bg grid place-items-center p-6 text-center">
        <div>
          <AlertCircle className="w-10 h-10 text-text-subtle mx-auto opacity-60" />
          <h1 className="font-display text-2xl mt-4">This link has expired</h1>
          <p className="text-sm text-text-muted mt-1">Ask the sender for a fresh link.</p>
        </div>
      </div>
    );
  }

  const talents: Talent[] = packet.talentIds
    .map((id) => TALENTS.find((t) => t.id === id))
    .filter((t): t is Talent => !!t);

  return (
    <div className="min-h-dvh bg-bg pb-12">
      {/* Header band */}
      <div className="border-b border-border bg-bg-elevated/60">
        <div className="max-w-[640px] mx-auto px-5 py-6">
          <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">
            Casting shortlist
          </div>
          <h1 className="font-display text-3xl tracking-editorial mt-1">{packet.title}</h1>
          {(packet.projectTitle || packet.roleName) && (
            <p className="text-sm text-text-muted mt-1">
              {packet.projectTitle}{packet.projectTitle && packet.roleName ? " · " : ""}{packet.roleName}
            </p>
          )}
          {packet.note && (
            <div className="mt-3 p-3 rounded-2xl bg-gold/8 border border-gold/30 text-xs leading-relaxed">
              {packet.note}
            </div>
          )}
          <p className="text-[10px] text-text-subtle mt-3">
            Shared via CastIt · {talents.length} talent{talents.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Talent cards */}
      <div className="max-w-[640px] mx-auto px-5 pt-5 space-y-3">
        {talents.length === 0 ? (
          <div className="text-center py-12 text-sm text-text-muted">
            No talents on this shortlist.
          </div>
        ) : (
          talents.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl bg-bg-elevated border border-border overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === t.id ? null : t.id)}
                className="flex items-center gap-3 p-4 w-full text-left"
              >
                <span className="text-[10px] tnum text-text-subtle w-5 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <img src={t.photo} alt={t.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate">{t.name}</span>
                    {t.verified && <VerifiedBadge />}
                  </div>
                  <p className="text-[11px] text-text-muted truncate mt-0.5">
                    {t.typecast.gender} · {t.typecast.ageRange[0]}–{t.typecast.ageRange[1]} · {t.typecast.heightCm}cm · {t.typecast.location}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {t.typecast.skills.slice(0, 3).map((s) => (
                      <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full bg-bg border border-border text-text-muted">{s}</span>
                    ))}
                  </div>
                </div>
                <ChevronRight className={"w-4 h-4 text-text-muted shrink-0 transition-transform " + (open === t.id ? "rotate-90" : "")} />
              </button>

              {open === t.id && (
                <TalentDetail talent={t} />
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* spacer */}

      {/* Footer */}
      <div className="max-w-[640px] mx-auto px-5 mt-10 text-center">
        <div className="inline-flex items-center gap-1.5 text-[10px] text-text-subtle">
          <Heart className="w-3 h-3" /> Curated on CastIt
        </div>
      </div>
    </div>
  );
}

function TalentDetail({ talent }: { talent: Talent }) {
  const reels = REELS.filter((r) => r.talentId === talent.id).slice(0, 4);
  return (
    <div className="border-t border-border p-4 space-y-3">
      {talent.bio && <p className="text-sm text-text leading-relaxed">{talent.bio}</p>}
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gold">
        <Film className="w-3 h-3" /> Reels
      </div>
      {reels.length === 0 ? (
        <p className="text-[11px] text-text-muted">No reels yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {reels.map((r) => (
            <div key={r.id} className="aspect-[9/16] rounded-xl bg-black overflow-hidden relative">
              <video
                src={r.videoUrl}
                poster={r.poster}
                controls
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
