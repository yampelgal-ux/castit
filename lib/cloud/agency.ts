"use client";

// Agencies (Supabase migration 008): an approved pro account keeps a roster of
// actors who agreed to be represented and submits them to auditions behind an
// invite code. The casting director owns the submission, the actor gets it in
// their inbox, and the agent follows its status (stored under KEY_AGENCY).

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import type { Project, Role, Submission } from "@/lib/projects-store";
import { isCloudConfigured, isRealUserId } from "./config";
import { refreshShared } from "./shared";
import { sendPush } from "./push";

export const KEY_AGENCY = "castit_agency_subs_v1";
export type AgencySub = { submission: Submission; role: Role | null; project: Project | null; ownerId: string };

export type RosterEntry = { talent_id: string; status: "pending" | "accepted"; name: string | null; username: string | null; photo_url: string | null; created_at: string };
export type MyAgency = { agent_id: string; status: "pending" | "accepted"; agency_name: string | null; agent_name: string | null; photo_url: string | null; created_at: string };

/** "missing" = migration 008 hasn't been run on this Supabase project yet. */
export type Loaded<T> = { ok: true; data: T } | { ok: false; reason: "missing" | "error" | "offline" };

function missing(code?: string, msg?: string) {
  return code === "PGRST202" || code === "PGRST205" || code === "42P01" || code === "42883" || /does not exist|could not find/i.test(msg ?? "");
}
function ready() {
  return isCloudConfigured() && isRealUserId(useStore.getState().userId);
}

export async function loadRoster(): Promise<Loaded<RosterEntry[]>> {
  if (!ready()) return { ok: false, reason: "offline" };
  const { data, error } = await supabase.rpc("agent_roster");
  if (error) return { ok: false, reason: missing(error.code, error.message) ? "missing" : "error" };
  return { ok: true, data: (data ?? []) as RosterEntry[] };
}

export async function requestRoster(talentId: string, agencyName: string): Promise<string | null> {
  const me = useStore.getState().userId;
  if (!ready()) return "offline";
  const { error } = await supabase.from("agency_roster").insert({ agent_id: me, talent_id: talentId, agency_name: agencyName || null });
  if (error) return /duplicate|unique/i.test(error.message) ? null : missing(error.code, error.message) ? "missing" : error.message;
  sendPush(talentId, "agency", { href: "/settings#agency" });
  return null;
}

export async function removeFromRoster(talentId: string): Promise<boolean> {
  const me = useStore.getState().userId;
  const { error } = await supabase.from("agency_roster").delete().eq("agent_id", me).eq("talent_id", talentId);
  return !error;
}

export async function loadMyAgencies(): Promise<Loaded<MyAgency[]>> {
  if (!ready()) return { ok: false, reason: "offline" };
  const { data, error } = await supabase.rpc("my_agencies");
  if (error) return { ok: false, reason: missing(error.code, error.message) ? "missing" : "error" };
  return { ok: true, data: (data ?? []) as MyAgency[] };
}

export async function answerAgency(agentId: string, accept: boolean): Promise<boolean> {
  const me = useStore.getState().userId;
  const q = accept
    ? supabase.from("agency_roster").update({ status: "accepted" }).eq("agent_id", agentId).eq("talent_id", me)
    : supabase.from("agency_roster").delete().eq("agent_id", agentId).eq("talent_id", me);
  const { error } = await q;
  return !error;
}

/** Submit actors from the roster to the audition behind an invite code. Returns how many went in. */
export async function submitRosterToCall(code: string, talentIds: string[]): Promise<{ ok: number; failed: string[] }> {
  let ok = 0;
  const failed: string[] = [];
  let owner: { id: string; role: Role | null } | null = null;
  for (const id of talentIds) {
    const { data, error } = await supabase.rpc("agent_submit_to_call", { p_code: code, p_talent: id });
    if (error || !data) { failed.push(id); continue; }
    ok++;
    if (!owner) {
      const { data: row } = await supabase.from("shared_records").select("owner_id,data").eq("id", data as string).maybeSingle();
      if (row) owner = { id: row.owner_id as string, role: ((row.data as { role?: Role })?.role) ?? null };
    }
  }
  if (owner && ok) {
    const r = owner.role;
    sendPush(owner.id, "joined", { role: r?.name, href: r ? `/pro/projects/${r.projectId}/role/${r.id}` : "/pro/projects" });
  }
  if (ok) await refreshShared();
  return { ok, failed };
}

/** Auditions this agent submitted actors to, newest first (kept in sync by the shared layer). */
export function useAgencySubs(): AgencySub[] {
  const read = () => {
    try { return (JSON.parse(localStorage.getItem(KEY_AGENCY) || "[]") as AgencySub[]); } catch { return []; }
  };
  const [subs, setSubs] = useState<AgencySub[]>([]);
  useEffect(() => {
    setSubs(read());
    const on = () => setSubs(read());
    window.addEventListener("castit:remote-update", on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener("castit:remote-update", on); window.removeEventListener("storage", on); };
  }, []);
  return subs.slice().sort((a, b) => (b.submission.createdAt || "").localeCompare(a.submission.createdAt || ""));
}
