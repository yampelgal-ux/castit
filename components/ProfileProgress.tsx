"use client";
import { TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";

type ProfileLike = {
  name?: string;
  bio?: string;
  photo?: string;
  cover?: string;
  typecast?: {
    heightCm?: number;
    weightKg?: number;
    skinTone?: string;
    eyeColor?: string;
    hairColor?: string;
    languages?: string[];
    skills?: string[];
  };
};

export function computeProfileScore(p: ProfileLike): { score: number; missing: string[] } {
  const checks: { ok: boolean; label: string }[] = [
    { ok: !!p.name && p.name.length > 1, label: "Display name" },
    { ok: !!p.bio && p.bio.length > 10, label: "Bio" },
    { ok: !!p.photo, label: "Profile photo" },
    { ok: !!p.cover, label: "Cover photo" },
    { ok: !!p.typecast?.heightCm, label: "Height" },
    { ok: !!p.typecast?.skinTone, label: "Skin tone" },
    { ok: !!p.typecast?.eyeColor, label: "Eye color" },
    { ok: !!p.typecast?.hairColor, label: "Hair color" },
    { ok: (p.typecast?.languages?.length ?? 0) > 0, label: "Languages" },
    { ok: (p.typecast?.skills?.length ?? 0) > 0, label: "Skills" },
  ];
  const done = checks.filter((c) => c.ok).length;
  return {
    score: Math.round((done / checks.length) * 100),
    missing: checks.filter((c) => !c.ok).map((c) => c.label),
  };
}

// Localized field labels for the "what's missing" nudge
const FIELD_KEY: Record<string, string> = {
  "Display name": "pp.f.name",
  "Bio": "pp.f.bio",
  "Profile photo": "pp.f.photo",
  "Cover photo": "pp.f.cover",
  "Height": "pp.f.height",
  "Skin tone": "pp.f.skin",
  "Eye color": "pp.f.eyes",
  "Hair color": "pp.f.hair",
  "Languages": "pp.f.langs",
  "Skills": "pp.f.skills",
};

export function ProfileProgress({ profile, action }: { profile: ProfileLike; action?: ReactNode }) {
  const { t } = useT();
  const { score, missing } = computeProfileScore(profile);
  if (score === 100) return null;

  const missingLabels = missing.map((m) => t(FIELD_KEY[m] ?? m));
  const discoverability =
    score >= 80 ? t("pp.high") : score >= 50 ? t("pp.mid") : t("pp.low");

  return (
    <div className="rounded-2xl bg-bg-elevated border border-gold/20 p-4 ring-1 ring-gold/10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gold" />
          <span className="text-xs uppercase tracking-widest text-gold font-semibold">
            {t("pp.title")} · {score}%
          </span>
        </div>
        {action}
      </div>
      {/* Discoverability framing — why completing matters */}
      <div className="text-[11px] mb-2.5">
        <span className="text-text-muted">{t("pp.discoverability")}: </span>
        <span className={score >= 80 ? "text-success font-semibold" : score >= 50 ? "text-gold font-semibold" : "text-terra font-semibold"}>
          {discoverability}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-bg overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-gold-light to-gold rounded-full transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
      {missingLabels.length > 0 && (
        <p className="text-[11px] text-text-muted mt-2.5 leading-relaxed">
          {t("pp.add")} <span className="text-text">{missingLabels.slice(0, 2).join(", ")}</span>
          {missingLabels.length > 2 && ` ${t("pp.more", { n: missingLabels.length - 2 })}`} {t("pp.toGetFound")}
        </p>
      )}
    </div>
  );
}
