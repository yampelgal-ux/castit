"use client";

import { supabase } from "@/lib/supabase";
import type { useStore } from "@/lib/store";
import type { Talent } from "@/lib/mock-data";
import { toDbRole } from "./auth";
import { dataUrlToBlob, uploadMedia, mediaPublicUrl } from "./media";
import type { MyReel } from "@/lib/reels-store";
import { posterPathFor } from "@/lib/video-poster";

type Profile = ReturnType<typeof useStore.getState>["profile"];

let lastHash = "";

/** Outcome of the latest public-profile publish, for the settings screen. */
export type PublishStatus = { ok: boolean; error?: string; at: number; reels: number } | null;
let status: PublishStatus = null;
export function lastPublishStatus(): PublishStatus { return status; }
function report(next: PublishStatus) {
  status = next;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("castit:profile-published"));
}
const uploadedPhotos = new Map<string, string>(); // data-URL fingerprint → public URL

async function resolvePhoto(userId: string, photo?: string): Promise<string | undefined> {
  if (!photo || !photo.startsWith("data:")) return photo;
  const fp = `${photo.length}:${photo.slice(-64)}`;
  const known = uploadedPhotos.get(fp);
  if (known) return known;
  try {
    const blob = await dataUrlToBlob(photo);
    const ext = blob.type.includes("png") ? "png" : "jpg";
    const url = await uploadMedia(`avatars/${userId}-${Date.now().toString(36)}.${ext}`, blob);
    if (url) { uploadedPhotos.set(fp, url); return url; }
  } catch {}
  return undefined;
}

function toTalentCard(userId: string, p: Profile, photo?: string, reels: MyReel[] = [], headshots: string[] = []): Talent {
  const tc = p.typecast || {};
  const min = tc.ageRangeMin ?? 20;
  const max = tc.ageRangeMax ?? Math.max(min + 10, 30);
  return {
    id: userId,
    username: p.username,
    name: p.name,
    verified: false,
    photo: photo || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(p.avatarSeed || p.name)}`,
    cover: "",
    bio: p.bio || "",
    followers: 0,
    likes: 0,
    submissions: 0,
    headshots,
    reels: reels
      .filter((r) => r.cloud)
      .map((r) => ({
        id: r.id, url: mediaPublicUrl(`tapes/${r.blobKey}`) || "", caption: r.caption, createdAt: r.createdAt,
        ...(r.poster ? { poster: mediaPublicUrl(posterPathFor(r.blobKey)) || undefined } : {}),
      }))
      .filter((r) => r.url),
    typecast: {
      heightCm: tc.heightCm ?? 170,
      weightKg: tc.weightKg ?? 65,
      ageRange: [min, max],
      gender: (tc.gender as Talent["typecast"]["gender"]) || "Female",
      ethnicity: tc.ethnicity || "",
      skinTone: tc.skinTone || "#C89366",
      eyeColor: tc.eyeColor || "#5A3520",
      hairColor: tc.hairColor || "#3A2418",
      hairLength: (tc.hairLength as Talent["typecast"]["hairLength"]) || "Medium",
      languages: tc.languages || ["Hebrew"],
      skills: tc.skills || [],
      genres: tc.genres || [],
      location: tc.location || "",
      bodyType: (tc.bodyType as Talent["typecast"]["bodyType"]) || undefined,
      features: tc.features || [],
      accents: tc.accents || [],
      voiceType: (tc.voiceType as Talent["typecast"]["voiceType"]) || undefined,
      unionStatus: (tc.unionStatus as Talent["typecast"]["unionStatus"]) || undefined,
      experienceLevel: (tc.experienceLevel as Talent["typecast"]["experienceLevel"]) || undefined,
      willingToTravel: tc.willingToTravel,
      hairType: tc.hairType,
      facialHair: tc.facialHair,
      clothingSize: tc.clothingSize,
      shoeSizeEU: tc.shoeSizeEU,
      driverLicense: tc.driverLicense,
      hasAgent: tc.hasAgent,
      workPermits: tc.workPermits || [],
    },
  };
}

/** Upsert the signed-in user's public profile (+ talent card for talents). */
export async function publishMyProfile(userId: string, p: Profile, reels: MyReel[] = []) {
  if (!p.name) { report({ ok: false, error: "missing-name", at: Date.now(), reels: 0 }); return; }
  const hash = JSON.stringify([userId, p, reels]);
  if (hash === lastHash) return;

  const photo = await resolvePhoto(userId, p.photoUrl);
  // Photos added while offline are still data URLs; upload them now.
  const headshots = (await Promise.all((p.headshots ?? []).map((h) => resolvePhoto(userId, h))))
    .filter((u): u is string => !!u && /^https?:/.test(u));
  const isTalent = p.role !== "Casting Pro";
  const baseUsername = (p.username || p.name).toLowerCase().replace(/[^a-z0-9_]/g, "") || `user${userId.slice(0, 6)}`;

  const row = {
    id: userId,
    username: baseUsername,
    name: p.name,
    bio: p.bio ?? null,
    photo_url: photo ?? null,
    role: toDbRole(p.role),
    talent_card: isTalent ? toTalentCard(userId, p, photo, reels, headshots) : null,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
  if (error && /username|duplicate|unique/i.test(error.message)) {
    const retry = { ...row, username: `${baseUsername}${userId.slice(0, 4)}` };
    ({ error } = await supabase.from("profiles").upsert(retry, { onConflict: "id" }));
  }
  if (error) {
    console.warn("[profile] publish failed", error.message);
    report({ ok: false, error: error.message, at: Date.now(), reels: 0 });
    return;
  }
  report({ ok: true, at: Date.now(), reels: row.talent_card?.reels?.length ?? 0 });

  if (isTalent) {
    const tc = p.typecast || {};
    await supabase.from("typecasts").upsert({
      profile_id: userId,
      height: tc.heightCm ?? null,
      weight: tc.weightKg ?? null,
      age_range: tc.ageRangeMin != null ? `${tc.ageRangeMin}-${tc.ageRangeMax ?? tc.ageRangeMin + 10}` : null,
      gender: tc.gender ?? null,
      skin_tone: tc.skinTone ?? null,
      eye_color: tc.eyeColor ?? null,
      hair_color: tc.hairColor ?? null,
      hair_length: tc.hairLength ?? null,
      languages: tc.languages ?? null,
      skills: tc.skills ?? null,
      genres: tc.genres ?? null,
    }, { onConflict: "profile_id" });
  }
  lastHash = hash;
}
