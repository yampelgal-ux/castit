"use client";

// Invite links (Supabase migration 006): a casting director makes a link for a
// role and sends it on WhatsApp to actors who aren't on CastIt yet. The actor
// opens /join/<code>, signs up, and the invite lands in their inbox — the same
// submission a direct invite would create.

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import type { Project, Role } from "@/lib/projects-store";
import { isCloudConfigured, isRealUserId } from "./config";
import { refreshShared } from "./shared";

export type InviteLink = {
  code: string;
  message: string;
  deadline?: string;
  role: Pick<Role, "id" | "projectId" | "name" | "description" | "deadline" | "shootDates" | "payRange" | "selfTapeInstructions">;
  project: Pick<Project, "id" | "title" | "studio" | "type"> | null;
  proName: string;
  studio?: string;
  createdAt: string;
  joined?: number;
  closed?: boolean;
};

const PENDING = "pending_invite"; // no castit_ prefix: it must survive sign-out wipes

export function inviteUrl(code: string) {
  return `${window.location.origin}/join/${code}`;
}

function newCode() {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
}

/** This casting director's link for a role, if one exists. */
export async function loadInviteLink(roleId: string): Promise<InviteLink | null> {
  const me = useStore.getState().userId;
  if (!isCloudConfigured() || !isRealUserId(me)) return null;
  const { data } = await supabase.from("shared_records").select("data")
    .eq("owner_id", me).eq("kind", "open_invite").eq("data->role->>id", roleId).limit(1);
  return (data?.[0]?.data as InviteLink) ?? null;
}

export async function createInviteLink(role: Role, project: Project | null, message: string): Promise<InviteLink | null> {
  const me = useStore.getState().userId;
  if (!isCloudConfigured() || !isRealUserId(me)) return null;
  const p = useStore.getState().profile;
  const code = newCode();
  const data: InviteLink = {
    code,
    message,
    deadline: role.deadline,
    role: {
      id: role.id, projectId: role.projectId, name: role.name, description: role.description,
      deadline: role.deadline, shootDates: role.shootDates, payRange: role.payRange,
      selfTapeInstructions: role.selfTapeInstructions,
    },
    project: project ? { id: project.id, title: project.title, studio: project.studio, type: project.type } : null,
    proName: p.name || p.username,
    studio: p.studio || project?.studio,
    createdAt: new Date().toISOString(),
    joined: 0,
  };
  const { error } = await supabase.from("shared_records").insert(
    { id: `inv:${code}`, kind: "open_invite", owner_id: me, slug: code, is_public: true, data },
  );
  if (error) { console.warn("[invites] create", error.message); return null; }
  return data;
}

export async function setInviteClosed(link: InviteLink, closed: boolean): Promise<InviteLink | null> {
  // Re-read first so a join that just happened isn't overwritten.
  const { data: cur } = await supabase.from("shared_records").select("data").eq("id", `inv:${link.code}`).maybeSingle();
  const next = { ...((cur?.data as InviteLink) ?? link), closed };
  const { error } = await supabase.from("shared_records").update({ data: next }).eq("id", `inv:${link.code}`);
  return error ? null : next;
}

/** Anyone with the link, signed in or not. */
export async function fetchInvite(code: string): Promise<InviteLink | null> {
  if (!isCloudConfigured()) return null;
  const { data, error } = await supabase.rpc("get_public_link", { p_slug: code });
  if (error || !data || (data as InviteLink).code !== code) return null;
  return data as InviteLink;
}

/** The signed-in actor joins; returns the shared submission id, or null. */
export async function claimInvite(code: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("claim_open_invite", { p_code: code });
  if (error) { console.warn("[invites] claim", error.message); return null; }
  if (data) await refreshShared();
  return (data as string) ?? null;
}

export function rememberInvite(code: string) {
  try { localStorage.setItem(PENDING, code); } catch {}
}
function pendingInvite(): string | null {
  try { return localStorage.getItem(PENDING); } catch { return null; }
}
function forgetInvite() {
  try { localStorage.removeItem(PENDING); } catch {}
}

/** After someone signs up from an invite link, join that audition once their profile is set up. */
export function useClaimPendingInvite() {
  const userId = useStore((s) => s.userId);
  const role = useStore((s) => s.profile.role);
  const name = useStore((s) => s.profile.name);
  useEffect(() => {
    if (!isCloudConfigured() || !isRealUserId(userId) || !name) return;
    const code = pendingInvite();
    if (!code) return;
    if (role !== "Talent") { forgetInvite(); return; }
    forgetInvite();
    void claimInvite(code);
  }, [userId, role, name]);
}
