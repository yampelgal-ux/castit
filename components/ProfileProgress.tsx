"use client";
import { TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

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

export function ProfileProgress({ profile, action }: { profile: ProfileLike; action?: ReactNode }) {
  const { score, missing } = computeProfileScore(profile);
  if (score === 100) return null;

  return (
    <div className="rounded-2xl bg-bg-elevated border border-gold/20 p-4 ring-1 ring-gold/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gold" />
          <span className="text-xs uppercase tracking-widest text-gold font-semibold">Profile {score}%</span>
        </div>
        {action}
      </div>
      <div className="h-1.5 rounded-full bg-bg overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-gold-light to-gold rounded-full transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
      {missing.length > 0 && (
        <p className="text-[11px] text-text-muted mt-2.5 leading-relaxed">
          Add <span className="text-text">{missing.slice(0, 2).join(", ")}</span>
          {missing.length > 2 && ` + ${missing.length - 2} more`} to get found by more castings.
        </p>
      )}
    </div>
  );
}
