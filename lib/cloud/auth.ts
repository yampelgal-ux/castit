"use client";

import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { CLOUD_UID_KEY, isCloudConfigured } from "./config";
import { isSyncedKey, stopSync, writeLocalSilently } from "./sync";
import { stopShared } from "./shared";

type DbRole = "talent" | "casting_pro";
export const toDbRole = (r: "Talent" | "Casting Pro"): DbRole => (r === "Casting Pro" ? "casting_pro" : "talent");
export const fromDbRole = (r?: string | null): "Talent" | "Casting Pro" =>
  r === "casting_pro" || r === "pro" ? "Casting Pro" : "Talent";

/**
 * A brand-new account was just created on this device: drop the demo / guest
 * data so it never ends up inside the real account, and mark the device as
 * belonging to this user so everything done from now on is synced to it.
 */
export function claimDeviceForNewAccount(userId: string) {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && isSyncedKey(k) && k !== "castit_app_v1") keys.push(k);
  }
  keys.forEach((k) => writeLocalSilently(k, null));
  writeLocalSilently(CLOUD_UID_KEY, userId);
  writeLocalSilently("castit_demo_seeded_v2", "1");
  writeLocalSilently("castit_shared_meta_v1", null);
}

/** Load the profile row for a signed-in user into the app store. */
export async function loadAccountIntoStore(user: User): Promise<"Talent" | "Casting Pro"> {
  const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const st = useStore.getState();
  const role = prof ? fromDbRole(prof.role) : st.profile.role;
  // Only overwrite fields the cloud actually knows; keep richer local data (typecast etc.)
  if (st.userId !== user.id || !st.profile.name) {
    st.setProfile({
      name: prof?.name || st.profile.name || (user.email ?? "").split("@")[0],
      email: user.email ?? st.profile.email,
      role,
      username: prof?.username || st.profile.username,
      bio: prof?.bio ?? st.profile.bio,
      photoUrl: prof?.photo_url ?? st.profile.photoUrl,
      avatarSeed: st.profile.avatarSeed && st.profile.avatarSeed !== "newuser" ? st.profile.avatarSeed : (prof?.name || "user"),
    });
  }
  if (!st.isAuthed || st.userId !== user.id) st.signIn(user.id);
  if (role === "Casting Pro" && !st.onboarded) st.completeOnboarding();
  return role;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function sendPasswordReset(email: string) {
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

/** Sign out: push pending changes, stop sync, wipe this account's data from the device. */
export async function signOutEverywhere() {
  try { stopShared(); await stopSync({ wipeLocal: true }); } catch {}
  if (isCloudConfigured()) {
    try { await supabase.auth.signOut(); } catch {}
  }
  useStore.getState().signOut();
  try { localStorage.removeItem("castit_app_v1"); } catch {}
}
