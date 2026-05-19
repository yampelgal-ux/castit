"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Rocket, Zap, Eye, TrendingUp, Check, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { getAudition } from "@/lib/auditions-store";
import type { Audition } from "@/lib/mock-data";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type Tier = {
  id: "spotlight" | "broadcast" | "campaign";
  name: string;
  price: number;
  duration: string;
  reach: string;
  features: string[];
  badge?: string;
  recommended?: boolean;
};

const TIERS: Tier[] = [
  {
    id: "spotlight",
    name: "Spotlight",
    price: 49,
    duration: "24 hours",
    reach: "~ 8,000 talents",
    features: [
      "Top placement on For You feed",
      "Gold-border highlight in Discover",
      "Push notification to perfectly-matched talent",
    ],
  },
  {
    id: "broadcast",
    name: "Broadcast",
    price: 149,
    duration: "72 hours",
    reach: "~ 24,000 talents",
    recommended: true,
    badge: "MOST POPULAR",
    features: [
      "Everything in Spotlight",
      "Story-style banner across the app for 3 days",
      "Email + in-app blast to top 500 matches",
      "Featured in weekly digest",
    ],
  },
  {
    id: "campaign",
    name: "Campaign",
    price: 399,
    duration: "7 days",
    reach: "~ 60,000+ talents",
    features: [
      "Everything in Broadcast",
      "Dedicated landing page with showreel embed",
      "Direct invite-to-apply for top 2,000 matches",
      "Daily applicant report from Aria",
      "Priority human casting support",
    ],
  },
];

export default function BoostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [audition, setAudition] = useState<Audition | undefined>();
  const [selected, setSelected] = useState<Tier["id"]>("broadcast");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => { setAudition(getAudition(id)); }, [id]);

  const tier = TIERS.find((t) => t.id === selected)!;

  if (confirmed) {
    return (
      <div className="min-h-dvh bg-bg grid place-items-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-gold/20 grid place-items-center mx-auto mb-5">
            <Rocket className="w-10 h-10 text-gold" />
          </div>
          <h1 className="font-display text-3xl tracking-editorial">Boost live</h1>
          <p className="text-text-muted text-sm mt-2 leading-relaxed">
            Your audition is now spotlighted. You'll see applications spike in the next hour — Aria is monitoring and will surface top matches in real time.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <Stat n="0" l="Views" tone="text" />
            <Stat n="0" l="Apps" tone="text" />
            <Stat n="LIVE" l="Status" tone="gold" />
          </div>
          <button
            onClick={() => router.push(`/pro/audition/${id}`)}
            className="mt-7 w-full h-12 rounded-full bg-gold text-bg font-semibold"
          >
            Back to audition
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg pb-32">
      <Header back title="Boost audition" right={<Rocket className="w-4 h-4 text-gold" />} />

      <div className="px-5 pt-3 space-y-5">
        <div>
          <h1 className="font-display text-3xl tracking-editorial">
            Massive reach. <em className="text-gold-gradient not-italic">Now.</em>
          </h1>
          {audition && (
            <p className="text-text-muted text-sm mt-1.5 truncate">
              Promoting <span className="text-text">{audition.title}</span>
            </p>
          )}
        </div>

        {/* Why boost — proof points */}
        <div className="grid grid-cols-3 gap-2">
          <ProofPoint icon={Eye} value="12×" label="more views" />
          <ProofPoint icon={Zap} value="6h" label="avg time-to-cast" />
          <ProofPoint icon={TrendingUp} value="3.4×" label="application rate" />
        </div>

        <div className="space-y-3">
          {TIERS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSelected(t.id); haptic("light"); }}
              className={cn(
                "w-full text-left rounded-2xl p-4 border-2 transition-all relative",
                selected === t.id
                  ? "border-gold bg-gradient-to-br from-gold/10 to-bg-elevated"
                  : "border-border bg-bg-elevated"
              )}
            >
              {t.badge && (
                <span className="absolute -top-2 left-4 text-[9px] uppercase tracking-widest font-bold bg-gold text-bg px-2 py-0.5 rounded-full">
                  {t.badge}
                </span>
              )}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="font-display text-xl">{t.name}</div>
                  <div className="text-[11px] text-text-muted mt-0.5">{t.duration} · {t.reach}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl tnum text-gold">${t.price}</div>
                  <div className="text-[9px] uppercase tracking-wider text-text-subtle">one-time</div>
                </div>
              </div>
              <ul className="space-y-1.5 mt-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12px]">
                    <Check className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", selected === t.id ? "text-gold" : "text-text-muted")} />
                    <span className={selected === t.id ? "text-text" : "text-text-muted"}>{f}</span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-violet/10 border border-violet/30 p-3.5 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-violet shrink-0 mt-0.5" />
          <p className="text-[12px] text-text leading-relaxed">
            <span className="font-semibold text-violet">Aria recommends Broadcast</span> — based on your target typecast,
            we estimate <span className="font-semibold">~420 high-match applications</span> in the first 48 hours.
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 max-w-[440px] mx-auto p-4 border-t border-border bg-bg/95 backdrop-blur">
        <button
          onClick={() => { haptic("success"); setConfirmed(true); }}
          className="w-full h-12 rounded-full bg-gold text-bg font-semibold inline-flex items-center justify-center gap-2"
        >
          <Rocket className="w-4 h-4" /> Launch {tier.name} — ${tier.price}
        </button>
        <p className="text-[10px] text-center text-text-subtle mt-2">
          No commitment. Cancel anytime before launch.
        </p>
      </div>
    </div>
  );
}

function ProofPoint({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-bg-elevated border border-border p-3 text-center">
      <Icon className="w-4 h-4 text-gold mx-auto mb-1.5" />
      <div className="font-display text-xl tnum">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-text-muted">{label}</div>
    </div>
  );
}

function Stat({ n, l, tone }: { n: string; l: string; tone: "text" | "gold" }) {
  return (
    <div className="rounded-xl bg-bg-elevated border border-border p-3">
      <div className={cn("font-display text-lg tnum", tone === "gold" ? "text-gold" : "")}>{n}</div>
      <div className="text-[9px] uppercase tracking-wider text-text-muted">{l}</div>
    </div>
  );
}
