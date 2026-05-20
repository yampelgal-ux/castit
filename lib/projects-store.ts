"use client";

// === Audition pipeline stages ===
// invited        — pro invited the talent; no tape yet
// submitted      — tape received (round N), needs decision
// callback       — advanced; new tape requested (or moved straight to avail)
// hold           — "maybe" pile, keep warm
// avail_check    — checking dates against shoot window
// offered        — formal offer extended
// booked         — talent confirmed for the role
// rejected       — passed on
export type Stage =
  | "invited"
  | "submitted"
  | "callback"
  | "hold"
  | "avail_check"
  | "offered"
  | "booked"
  | "rejected";

export const STAGE_META: Record<Stage, { label: string; tone: "gold" | "plum" | "sage" | "success" | "muted" | "violet" | "danger" }> = {
  invited:     { label: "Invited",          tone: "plum" },
  submitted:   { label: "To review",        tone: "gold" },
  callback:    { label: "Callback",         tone: "success" },
  hold:        { label: "Hold",             tone: "sage" },
  avail_check: { label: "Avail check",      tone: "plum" },
  offered:     { label: "Offer out",        tone: "violet" },
  booked:      { label: "Booked",           tone: "success" },
  rejected:    { label: "Passed",           tone: "muted" },
};

// One tape per round in the audition pipeline
export type Tape = {
  round: number;
  videoUrl?: string;
  posterUrl?: string;
  note?: string;
  submittedAt: string;
};

export type Submission = {
  id: string;
  roleId: string;
  talentId: string;
  talentName: string;
  talentPhoto: string;
  stage: Stage;
  tapes: Tape[];              // round 1 → callback round 2 → etc.
  inviteMessage?: string;     // pro's note when first inviting
  inviteDeadline?: string;    // ISO — when self-tape is due
  proMessage?: string;        // most recent message to talent
  shootDates?: string;
  payOffered?: string;
  decidedAt?: string;
  createdAt: string;
};

export type Role = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  sides?: string;                  // scene text or upload notes
  selfTapeInstructions?: string;   // slate, framing, takes
  deadline?: string;               // ISO date for tape submission
  shootDates?: string;             // e.g. "Aug 12 – Sep 25"
  payRange?: string;
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
const KEY_R = "castit_roles_v3";
const KEY_S = "castit_submissions_v3";

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

// === Projects ===
export function loadProjects(): Project[] { return safeLoad(KEY_P, SEED_PROJECTS); }
export function getProject(id: string) { return loadProjects().find((p) => p.id === id); }
export function addProject(p: Omit<Project, "id" | "createdAt">): Project {
  const list = loadProjects();
  const proj: Project = { ...p, id: uid("proj"), createdAt: new Date().toISOString() };
  list.unshift(proj);
  safeSave(KEY_P, list);
  return proj;
}
export function updateProject(id: string, patch: Partial<Project>) {
  const list = loadProjects();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
  safeSave(KEY_P, list);
}
export function deleteProject(id: string) {
  safeSave(KEY_P, loadProjects().filter((p) => p.id !== id));
  const roles = loadRoles().filter((r) => r.projectId !== id);
  safeSave(KEY_R, roles);
}

// === Roles ===
export function loadRoles(): Role[] { return safeLoad(KEY_R, SEED_ROLES); }
export function getRolesByProject(projectId: string) {
  return loadRoles().filter((r) => r.projectId === projectId);
}
export function getRole(id: string) { return loadRoles().find((r) => r.id === id); }
export function addRole(r: Omit<Role, "id" | "createdAt">): Role {
  const list = loadRoles();
  const role: Role = { ...r, id: uid("role"), createdAt: new Date().toISOString() };
  list.unshift(role);
  safeSave(KEY_R, list);
  return role;
}
export function updateRole(id: string, patch: Partial<Role>) {
  const list = loadRoles();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
  safeSave(KEY_R, list);
}
export function deleteRole(id: string) {
  safeSave(KEY_R, loadRoles().filter((r) => r.id !== id));
  safeSave(KEY_S, loadSubmissions().filter((s) => s.roleId !== id));
}

// === Submissions ===
export function loadSubmissions(): Submission[] { return safeLoad(KEY_S, SEED_SUBMISSIONS); }
export function getSubmissionsByRole(roleId: string) {
  return loadSubmissions().filter((s) => s.roleId === roleId);
}
export function getSubmission(id: string) { return loadSubmissions().find((s) => s.id === id); }
export function getInvitesForTalent(talentId: string) {
  return loadSubmissions().filter((s) => s.talentId === talentId);
}

// Pro invites a talent to a role → status invited, no tape yet
export function inviteTalent(
  roleId: string,
  talent: { id: string; name: string; photo: string },
  opts: { message?: string; deadline?: string } = {},
): Submission {
  const list = loadSubmissions();
  const sub: Submission = {
    id: uid("sub"),
    roleId,
    talentId: talent.id,
    talentName: talent.name,
    talentPhoto: talent.photo,
    stage: "invited",
    tapes: [],
    inviteMessage: opts.message,
    inviteDeadline: opts.deadline,
    proMessage: opts.message,
    createdAt: new Date().toISOString(),
  };
  list.unshift(sub);
  safeSave("castit_submissions_v3", list);
  return sub;
}

// Generic patch helper
function patchSubmission(id: string, patch: Partial<Submission>) {
  const list = loadSubmissions();
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch, decidedAt: new Date().toISOString() };
  safeSave(KEY_S, list);
}

// Pro decisions
export function moveToCallback(id: string, message?: string) {
  patchSubmission(id, { stage: "callback", proMessage: message });
}
export function moveToHold(id: string, message?: string) {
  patchSubmission(id, { stage: "hold", proMessage: message });
}
export function moveToAvailCheck(id: string, shootDates?: string, message?: string) {
  patchSubmission(id, { stage: "avail_check", shootDates, proMessage: message });
}
export function sendOffer(id: string, payOffered?: string, message?: string) {
  patchSubmission(id, { stage: "offered", payOffered, proMessage: message });
}
export function confirmBooked(id: string, message?: string) {
  patchSubmission(id, { stage: "booked", proMessage: message });
}
export function rejectSubmission(id: string, message?: string) {
  patchSubmission(id, { stage: "rejected", proMessage: message });
}
export function reopenSubmission(id: string) {
  const sub = getSubmission(id);
  if (!sub) return;
  const target: Stage = sub.tapes.length > 0 ? "submitted" : "invited";
  patchSubmission(id, { stage: target });
}

// Add a tape for the next round (called when talent submits a self-tape,
// or when pro manually adds one in this demo)
export function addTape(id: string, tape: Omit<Tape, "round" | "submittedAt"> & { submittedAt?: string }) {
  const list = loadSubmissions();
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) return;
  const sub = list[idx];
  const round = sub.tapes.length + 1;
  const next: Tape = {
    round,
    videoUrl: tape.videoUrl,
    posterUrl: tape.posterUrl,
    note: tape.note,
    submittedAt: tape.submittedAt ?? new Date().toISOString(),
  };
  list[idx] = { ...sub, tapes: [...sub.tapes, next], stage: "submitted" };
  safeSave(KEY_S, list);
}

// === Aggregates ===
export function projectCounts(projectId: string) {
  const roles = getRolesByProject(projectId);
  const subs = loadSubmissions().filter((s) => roles.some((r) => r.id === s.roleId));
  return {
    roles: roles.length,
    submissions: subs.length,
    toReview: subs.filter((s) => s.stage === "submitted").length,
    invited: subs.filter((s) => s.stage === "invited").length,
    callbacks: subs.filter((s) => s.stage === "callback").length,
    hold: subs.filter((s) => s.stage === "hold").length,
    booked: subs.filter((s) => s.stage === "booked").length,
  };
}

export function roleCounts(roleId: string) {
  const subs = getSubmissionsByRole(roleId);
  const by = (s: Stage) => subs.filter((x) => x.stage === s).length;
  return {
    total: subs.length,
    invited: by("invited"),
    submitted: by("submitted"),
    callback: by("callback"),
    hold: by("hold"),
    avail_check: by("avail_check"),
    offered: by("offered"),
    booked: by("booked"),
    rejected: by("rejected"),
  };
}
