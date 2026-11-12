"use client";

// Trust (Supabase migration 005): casting directors wait for approval before
// they can invite or message talent, minors need a parent's consent before
// casting directors can find them, and admins run both from /admin.

import { useEffect } from "react";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { isCloudConfigured, isRealUserId } from "./config";

export type ProStatus = "none" | "pending" | "approved" | "rejected";

type Trust = {
  loadedFor: string | null;
  proStatus: ProStatus;
  verified: boolean;
  isMinor: boolean;
  guardianOk: boolean;
  banned: boolean;
  isAdmin: boolean;
  /** False when the trust columns don't exist yet (migration not run). */
  available: boolean;
};

const INITIAL: Trust = {
  loadedFor: null, proStatus: "none", verified: false, isMinor: false, guardianOk: false,
  banned: false, isAdmin: false, available: false,
};

export const useTrustStore = create<Trust>(() => INITIAL);

let inflight: Promise<void> | null = null;

export function refreshTrust(): Promise<void> {
  const me = useStore.getState().userId;
  if (!isCloudConfigured() || !isRealUserId(me)) return Promise.resolve();
  if (inflight) return inflight;
  inflight = (async () => {
    const [{ data, error }, admin] = await Promise.all([
      supabase.from("profiles").select("pro_status,verified,is_minor,guardian_ok,banned").eq("id", me).maybeSingle(),
      supabase.rpc("is_admin"),
    ]);
    inflight = null;
    if (error) {
      // Columns missing → migration 005 not run yet; behave like before.
      useTrustStore.setState({ ...INITIAL, loadedFor: me });
      return;
    }
    const r = (data ?? {}) as any;
    useTrustStore.setState({
      loadedFor: me,
      proStatus: (r.pro_status as ProStatus) ?? "none",
      verified: !!r.verified,
      isMinor: !!r.is_minor,
      guardianOk: !!r.guardian_ok,
      banned: !!r.banned,
      isAdmin: admin.data === true,
      available: true,
    });
  })();
  return inflight;
}

/** This account's trust state (loads once per account). */
export function useTrust(): Trust {
  const userId = useStore((s) => s.userId);
  const t = useTrustStore();
  useEffect(() => {
    if (isRealUserId(userId) && t.loadedFor !== userId) void refreshTrust();
  }, [userId, t.loadedFor]);
  return t;
}

/** True when this casting director may send invites and messages. */
export function useCanContactTalent(): { ok: boolean; status: ProStatus } {
  const t = useTrust();
  const role = useStore((s) => s.profile.role);
  if (role !== "Casting Pro" || !t.available) return { ok: true, status: t.proStatus };
  return { ok: t.proStatus === "approved" && !t.banned, status: t.proStatus };
}

// ── Casting director application ─────────────────────────
export type ProApplication = { company?: string; job_title?: string; website?: string; phone?: string; note?: string };

export async function loadProApplication(): Promise<ProApplication | null> {
  const me = useStore.getState().userId;
  if (!isRealUserId(me)) return null;
  const { data } = await supabase.from("pro_applications").select("company,job_title,website,phone,note").eq("user_id", me).maybeSingle();
  return (data as ProApplication) ?? null;
}

export async function saveProApplication(a: ProApplication): Promise<boolean> {
  const me = useStore.getState().userId;
  if (!isCloudConfigured() || !isRealUserId(me)) return false;
  const { error } = await supabase.from("pro_applications").upsert({ user_id: me, ...a, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) console.warn("[trust] application", error.message);
  return !error;
}

// ── Parent consent ───────────────────────────────────────
export const ADULT_AGE = 18;

export function ageFromBirthYear(y?: number): number | null {
  return y ? new Date().getFullYear() - y : null;
}

/** The link a minor sends to a parent. Creates it on first use. */
export async function guardianLink(birthYear?: number): Promise<string | null> {
  const me = useStore.getState().userId;
  if (!isCloudConfigured() || !isRealUserId(me)) return null;
  let { data } = await supabase.from("guardian_consents").select("token").eq("user_id", me).maybeSingle();
  if (!data) {
    const ins = await supabase.from("guardian_consents").insert({ user_id: me, birth_year: birthYear ?? null }).select("token").single();
    if (ins.error) { console.warn("[trust] consent", ins.error.message); return null; }
    data = ins.data;
  }
  return `${window.location.origin}/guardian/${(data as any).token}`;
}

export type GuardianInfo = { name: string; username: string; photo_url: string | null; approved: boolean; parent_name: string | null };

export async function fetchGuardianInfo(token: string): Promise<GuardianInfo | null> {
  const { data, error } = await supabase.rpc("guardian_info", { p_token: token });
  if (error || !data?.length) return null;
  return data[0] as GuardianInfo;
}

export async function guardianDecide(token: string, parentName: string, approve: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc("guardian_decide", { p_token: token, p_parent_name: parentName, p_approve: approve });
  return !error && data === true;
}

// ── Admin ────────────────────────────────────────────────
export type AdminPro = {
  id: string; name: string | null; username: string; photo_url: string | null; email: string; pro_status: ProStatus;
  verified: boolean; banned: boolean; company: string | null; job_title: string | null; website: string | null;
  phone: string | null; note: string | null; created_at: string;
};
export type AdminReport = {
  id: string; created_at: string; status: string; target_kind: string; target_id: string | null; reason: string;
  details: string | null; reporter_id: string | null; reporter_name: string | null; target_user: string | null;
  target_name: string | null; target_username: string | null; target_banned: boolean;
};

export async function adminPros(): Promise<AdminPro[] | null> {
  const { data, error } = await supabase.rpc("admin_pros");
  return error ? null : (data as AdminPro[]);
}
export async function adminSetProStatus(id: string, status: ProStatus): Promise<boolean> {
  const { error } = await supabase.rpc("admin_set_pro_status", { p_user: id, p_status: status });
  return !error;
}
export async function adminSetBanned(id: string, banned: boolean): Promise<boolean> {
  const { error } = await supabase.rpc("admin_set_banned", { p_user: id, p_banned: banned });
  return !error;
}
export async function adminReports(): Promise<AdminReport[] | null> {
  const { data, error } = await supabase.rpc("admin_reports");
  return error ? null : (data as AdminReport[]);
}
export async function adminSetReportStatus(id: string, status: "open" | "handled" | "dismissed"): Promise<boolean> {
  const { error } = await supabase.rpc("admin_set_report_status", { p_id: id, p_status: status });
  return !error;
}
