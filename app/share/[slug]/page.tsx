"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Film, AlertCircle, Printer, MapPin, Ruler, Globe2 } from "lucide-react";
import { getPacketBySlug, logView, isExpired, type SharePacket } from "@/lib/share-store";
import { TALENTS, REELS, type Talent } from "@/lib/mock-data";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useT } from "@/lib/i18n";

export default function SharePage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, dir } = useT();
  const [packet, setPacket] = useState<SharePacket | null | undefined>(undefined);

  useEffect(() => {
    const p = getPacketBySlug(slug);
    setPacket(p ?? null);
    if (p) logView(slug);
  }, [slug]);

  if (packet === undefined) return <div className="min-h-dvh bg-bg" />;

  if (!packet) {
    return (
      <div className="min-h-dvh bg-bg grid place-items-center p-6 text-center">
        <div>
          <AlertCircle className="w-10 h-10 text-text-subtle mx-auto opacity-60" />
          <h1 className="font-display text-2xl mt-4">{t("report.notFound")}</h1>
          <p className="text-sm text-text-muted mt-1">{t("report.removed")}</p>
        </div>
      </div>
    );
  }

  if (isExpired(packet)) {
    return (
      <div className="min-h-dvh bg-bg grid place-items-center p-6 text-center">
        <div>
          <AlertCircle className="w-10 h-10 text-text-subtle mx-auto opacity-60" />
          <h1 className="font-display text-2xl mt-4">{t("report.expired")}</h1>
          <p className="text-sm text-text-muted mt-1">{t("report.expiredDesc")}</p>
        </div>
      </div>
    );
  }

  const talents: Talent[] = packet.talentIds
    .map((id) => TALENTS.find((tt) => tt.id === id))
    .filter((tt): tt is Talent => !!tt);

  const createdDate = packet.createdAt
    ? new Date(packet.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="min-h-dvh bg-bg pb-16" dir={dir}>
      {/* ── Report header (editorial) ── */}
      <div className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/8 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-[680px] mx-auto px-6 py-8 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.25em] text-gold font-semibold">
                {t("report.label")}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl tracking-editorial mt-1.5 leading-[1.05]">
                {packet.title}
              </h1>
              {(packet.projectTitle || packet.roleName) && (
                <p className="text-sm text-text-muted mt-2">
                  {packet.projectTitle}
                  {packet.projectTitle && packet.roleName ? " · " : ""}
                  <span className="text-gold">{packet.roleName}</span>
                </p>
              )}
            </div>
            {/* Print / Save PDF — hidden when printing */}
            <button
              onClick={() => window.print()}
              className="print:hidden shrink-0 h-10 px-4 rounded-full bg-gold text-bg text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Printer className="w-3.5 h-3.5" /> {t("report.print")}
            </button>
          </div>

          {packet.note && (
            <div className="mt-4 p-4 rounded-2xl bg-gold/8 border border-gold/25">
              <div className="text-[9px] uppercase tracking-[0.2em] text-gold font-semibold mb-1.5">
                {t("report.note")}
              </div>
              <p className="text-sm leading-relaxed text-text">{packet.note}</p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4 text-[11px] text-text-subtle">
            <span className="font-display text-gold text-sm">Cast<span className="text-text">It</span></span>
            <span>·</span>
            <span>{talents.length === 1 ? t("report.talent1") : t("report.talents", { n: talents.length })}</span>
            {createdDate && (<><span>·</span><span>{createdDate}</span></>)}
          </div>
        </div>
      </div>

      {/* ── Talent entries ── */}
      <div className="max-w-[680px] mx-auto px-6 pt-6 space-y-5">
        {talents.length === 0 ? (
          <div className="text-center py-12 text-sm text-text-muted">{t("report.empty")}</div>
        ) : (
          talents.map((talent, i) => (
            <ReportEntry key={talent.id} talent={talent} index={i} t={t} />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div className="max-w-[680px] mx-auto px-6 mt-12 pt-6 border-t border-border text-center">
        <div className="font-display text-lg">Cast<span className="text-gold">It</span></div>
        <div className="text-[10px] text-text-subtle mt-1 uppercase tracking-[0.2em]">
          {t("report.curated")}
        </div>
      </div>
    </div>
  );
}

function ReportEntry({
  talent, index, t,
}: {
  talent: Talent;
  index: number;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const reels = REELS.filter((r) => r.talentId === talent.id).slice(0, 2);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-3xl bg-bg-elevated border border-border overflow-hidden break-inside-avoid"
    >
      {/* Identity row */}
      <div className="flex items-start gap-4 p-5">
        <div className="relative shrink-0">
          <span className="absolute -top-1.5 -left-1.5 z-10 w-6 h-6 rounded-full bg-gold text-bg text-[11px] font-bold grid place-items-center font-display">
            {index + 1}
          </span>
          <img src={talent.photo} alt={talent.name} className="w-20 h-20 rounded-2xl object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="font-display text-xl tracking-editorial truncate">{talent.name}</h2>
            {talent.verified && <VerifiedBadge />}
          </div>
          {/* Key typecast line */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-text-muted">
            <span>{talent.typecast.gender} · {talent.typecast.ageRange[0]}–{talent.typecast.ageRange[1]}</span>
            <span className="inline-flex items-center gap-1"><Ruler className="w-3 h-3" />{talent.typecast.heightCm}cm</span>
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{talent.typecast.location}</span>
          </div>
          {/* Languages + skills chips */}
          <div className="flex flex-wrap gap-1 mt-2">
            {talent.typecast.languages.slice(0, 3).map((l) => (
              <span key={l} className="text-[9px] px-2 py-0.5 rounded-full bg-bg border border-border text-text-muted inline-flex items-center gap-1">
                <Globe2 className="w-2.5 h-2.5" />{l}
              </span>
            ))}
            {talent.typecast.skills.slice(0, 4).map((s) => (
              <span key={s} className="text-[9px] px-2 py-0.5 rounded-full bg-gold/10 border border-gold/25 text-gold">{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Bio */}
      {talent.bio && (
        <p className="px-5 -mt-1 pb-4 text-sm text-text leading-relaxed">{talent.bio}</p>
      )}

      {/* Reels */}
      {reels.length > 0 && (
        <div className="border-t border-border p-5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-gold mb-3">
            <Film className="w-3 h-3" /> {t("report.reels")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {reels.map((r) => (
              <div key={r.id} className="aspect-[9/16] rounded-2xl bg-black overflow-hidden">
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
        </div>
      )}
    </motion.div>
  );
}
