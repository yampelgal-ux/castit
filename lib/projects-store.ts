"use client";

export type SubmissionStatus = "invited" | "pending" | "callback" | "rejected";

export type Submission = {
  id: string;
  roleId: string;
  talentId: string;
  talentName: string;
  talentPhoto: string;
  videoUrl?: string;
  posterUrl?: string;
  note?: string;
  submittedAt: string;
  status: SubmissionStatus;
  decidedAt?: string;
  proMessage?: string;
};

export type Role = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
};

export type Project = {
  id: string;
  title: string;
  studio: string;
  type: "Feature Film" | "TV Series" | "Commercial" | "Short Film" | "Theater" | "Music Video";
  status: "casting" | "callbacks" | "closed";
  posterColor: string;
  description?: string;
  createdAt: string;
};

const KEY_P = "castit_projects_v2";
const KEY_R = "castit_roles_v2";
const KEY_S = "castit_submissions_v2";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const SEED_PROJECTS: Project[] = [];
const SEED_ROLES: Role[] = [];
const SEED_SUBMISSIONS: Submission[] = [];

function safeLoad<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return seed;
  }
}

function safeSave<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Projects
export function loadProjects(): Project[] {
  return safeLoad(KEY_P, SEED_PROJECTS);
}
export function getProject(id: string): Project | undefined {
  return loadProjects().find((p) => p.id === id);
}
export function addProject(p: Omit<Project, "id" | "createdAt">): Project {
  const list = loadProjects();
  const proj: Project = { ...p, id: uid("proj"), createdAt: new Date().toISOString() };
  list.unshift(proj);
  safeSave(KEY_P, list);
  return proj;
}
export function deleteProject(id: string) {
  safeSave(KEY_P, loadProjects().filter((p) => p.id !== id));
  safeSave(KEY_R, loadRoles().filter((r) => r.projectId !== id));
}

// Roles
export function loadRoles(): Role[] {
  return safeLoad(KEY_R, SEED_ROLES);
}
export function getRolesByProject(projectId: string): Role[] {
  return loadRoles().filter((r) => r.projectId === projectId);
}
export function getRole(id: string): Role | undefined {
  return loadRoles().find((r) => r.id === id);
}
export function addRole(r: Omit<Role, "id" | "createdAt">): Role {
  const list = loadRoles();
  const role: Role = { ...r, id: uid("role"), createdAt: new Date().toISOString() };
  list.unshift(role);
  safeSave(KEY_R, list);
  return role;
}
export function deleteRole(id: string) {
  safeSave(KEY_R, loadRoles().filter((r) => r.id !== id));
  safeSave(KEY_S, loadSubmissions().filter((s) => s.roleId !== id));
}

// Submissions
export function loadSubmissions(): Submission[] {
  return safeLoad(KEY_S, SEED_SUBMISSIONS);
}
export function getSubmissionsByRole(roleId: string): Submission[] {
  return loadSubmissions().filter((s) => s.roleId === roleId);
}
export function getSubmission(id: string): Submission | undefined {
  return loadSubmissions().find((s) => s.id === id);
}
export function inviteTalent(roleId: string, talent: { id: string; name: string; photo: string }, proMessage?: string): Submission {
  const list = loadSubmissions();
  const sub: Submission = {
    id: uid("sub"),
    roleId,
    talentId: talent.id,
    talentName: talent.name,
    talentPhoto: talent.photo,
    submittedAt: new Date().toISOString(),
    status: "invited",
    proMessage,
  };
  list.unshift(sub);
  safeSave(KEY_S, list);
  return sub;
}

export function getInvitesForTalent(talentId: string): Submission[] {
  return loadSubmissions().filter((s) => s.talentId === talentId);
}

export function decideSubmission(id: string, status: SubmissionStatus, proMessage?: string) {
  const list = loadSubmissions();
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) return;
  list[idx] = {
    ...list[idx],
    status,
    decidedAt: new Date().toISOString(),
    proMessage: proMessage ?? list[idx].proMessage,
  };
  safeSave(KEY_S, list);
}

// Aggregates
export function projectCounts(projectId: string) {
  const roles = getRolesByProject(projectId);
  const subs = loadSubmissions().filter((s) => roles.some((r) => r.id === s.roleId));
  return {
    roles: roles.length,
    submissions: subs.length,
    pending: subs.filter((s) => s.status === "pending").length,
    callbacks: subs.filter((s) => s.status === "callback").length,
    rejected: subs.filter((s) => s.status === "rejected").length,
  };
}

export function roleCounts(roleId: string) {
  const subs = getSubmissionsByRole(roleId);
  return {
    total: subs.length,
    pending: subs.filter((s) => s.status === "pending").length,
    callbacks: subs.filter((s) => s.status === "callback").length,
    rejected: subs.filter((s) => s.status === "rejected").length,
  };
}
