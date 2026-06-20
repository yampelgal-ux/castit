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

// Time-coded comment on a tape (e.g. "0:34 — great pause")
export type TapeComment = {
  id: string;
  tapeRound: number;
  timeSec: number;          // playback time when the comment was anchored
  text: string;
  createdAt: string;
};

// One tape per round in the audition pipeline
export type Tape = {
  round: number;
  videoUrl?: string;
  posterUrl?: string;
  note?: string;
  submittedAt: string;
  // Key for IndexedDB blob storage (persists across sessions, unlike blob: URLs)
  tapeBlobKey?: string;
  // Aria tape analysis (filled in lazily by /api/aria/analyze-tape)
  ariaAnalysis?: TapeAnalysis;
};

export type TapeAnalysis = {
  slateComplete: boolean;
  linesAccuracy?: number; // 0-100
  pacingNote?: string;
  emotionalChoice?: string;
  strengths: string[];
  concerns: string[];
  recommendation: "callback" | "hold" | "pass";
  summary: string;
  generatedAt: string;
};

// How the callback round is conducted
export type CallbackType = "in_person" | "tape";

export type Submission = {
  id: string;
  roleId: string;
  talentId: string;
  talentName: string;
  talentPhoto: string;
  stage: Stage;
  tapes: Tape[];              // round 1 → callback round 2 → etc.
  comments?: TapeComment[];   // pro's time-coded notes on tapes
  inviteMessage?: string;     // pro's note when first inviting
  inviteDeadline?: string;    // ISO — when self-tape is due
  proMessage?: string;        // most recent message to talent

  // Callback session fields (real-world flow)
  // "in_person" = scheduled meeting; cannot move to hold/offer/book until completed
  // "tape"      = requesting another self-tape; talent's tape arrival auto-marks done
  callbackType?: CallbackType;
  callbackScheduledAt?: string;   // ISO — when the in-person callback is
  callbackLocation?: string;      // e.g. "Tagada Studios, Tel Aviv"
  callbackCompleted?: boolean;    // pro confirms the session happened
  callbackOutcome?: string;       // optional note from the in-person session

  shootDates?: string;
  payOffered?: string;
  holdUntil?: string;         // ISO — auto-expiring hold (1st refusal)
  decidedAt?: string;

  // Availability response from the talent (two-sided avail-check flow)
  // "pending"     = pro asked, awaiting the talent's answer
  // "available"   = talent confirmed availability — pro can send offer
  // "unavailable" = talent isn't free for the dates
  availResponse?: "pending" | "available" | "unavailable";

  // Offer response from the talent (two-sided offer flow)
  // "pending"  = offer sent, awaiting the talent's answer
  // "accepted" = talent accepted — pro can confirm booking
  // "declined" = talent declined — submission moves to rejected
  offerResponse?: "pending" | "accepted" | "declined";

  // Stage the submission was in before being booked/rejected — lets Reopen
  // restore the talent to where they actually were, not back to "submitted".
  prevStage?: Stage;

  createdAt: string;
};

// Optional attachment (PDF/DOC/TXT) the pro uploads with the sides
export type RoleSidesFile = {
  name: string;        // original filename, e.g. "Maya sides — Round 1.pdf"
  type: string;        // mime type
  size: number;        // bytes
  blobKey: string;     // IndexedDB key — resolved via lib/sides-storage
};

export type Role = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  sides?: string;                  // scene text or upload notes
  sidesFile?: RoleSidesFile;       // optional attached file (PDF/DOC/TXT)
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
  // "full"  — principal casting, 8-stage pipeline (invited→submitted→callback→hold→avail→offered→booked)
  // "quick" — extras/models/background, 3-stage flow (invited→submitted→booked|rejected)
  mode?: "full" | "quick";
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
// Add many roles at once (used by AI bulk-import)
export function addRoles(rolesData: Omit<Role, "id" | "createdAt">[]): Role[] {
  const list = loadRoles();
  const created: Role[] = rolesData.map((r) => ({
    ...r,
    id: uid("role"),
    createdAt: new Date().toISOString(),
  }));
  list.unshift(...created);
  safeSave(KEY_R, list);
  return created;
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
// moveToCallback supports both modes:
//   in_person  → schedule a meeting (date/time/location). Must be marked done.
//   tape       → request another self-tape. Auto-completes when talent submits.
export function moveToCallback(
  id: string,
  opts?: {
    message?: string;
    type?: CallbackType;
    scheduledAt?: string;
    location?: string;
  },
) {
  const type = opts?.type ?? "in_person";
  patchSubmission(id, {
    stage: "callback",
    proMessage: opts?.message,
    callbackType: type,
    callbackScheduledAt: type === "in_person" ? opts?.scheduledAt : undefined,
    callbackLocation: type === "in_person" ? opts?.location : undefined,
    // Tape callbacks are "done" only when a new tape arrives (see addTape).
    // In-person callbacks are explicitly marked done by the pro.
    callbackCompleted: false,
    callbackOutcome: undefined,
  });
}

// Pro confirms the in-person callback session happened.
// Only after this can hold/offer/book actions appear (when in-person callback).
export function markCallbackDone(id: string, outcome?: string) {
  patchSubmission(id, { callbackCompleted: true, callbackOutcome: outcome });
}

// Pro decides the scheduled callback won't happen — back to "submitted".
export function cancelCallback(id: string, message?: string) {
  const sub = getSubmission(id);
  if (!sub) return;
  const target: Stage = sub.tapes.length > 0 ? "submitted" : "invited";
  patchSubmission(id, {
    stage: target,
    proMessage: message,
    callbackType: undefined,
    callbackScheduledAt: undefined,
    callbackLocation: undefined,
    callbackCompleted: false,
    callbackOutcome: undefined,
  });
}
export function moveToHold(id: string, message?: string, holdHours?: number) {
  const holdUntil = holdHours && holdHours > 0
    ? new Date(Date.now() + holdHours * 3600000).toISOString()
    : undefined;
  patchSubmission(id, { stage: "hold", proMessage: message, holdUntil });
}
export function moveToAvailCheck(id: string, shootDates?: string, message?: string) {
  // Availability check starts "pending" — the talent must respond.
  patchSubmission(id, { stage: "avail_check", shootDates, proMessage: message, availResponse: "pending" });
}

// Talent confirms they're available for the shoot dates — pro can send the offer.
export function confirmAvailable(id: string) {
  patchSubmission(id, { availResponse: "available" });
}

// Talent isn't free for the dates.
export function markUnavailable(id: string) {
  patchSubmission(id, { availResponse: "unavailable" });
}
export function sendOffer(id: string, payOffered?: string, message?: string) {
  // Offer starts "pending" — the talent must accept before it can be booked.
  patchSubmission(id, { stage: "offered", payOffered, proMessage: message, offerResponse: "pending" });
}

// Talent accepts the offer — pro can now confirm the booking.
export function acceptOffer(id: string) {
  patchSubmission(id, { offerResponse: "accepted" });
}

// Talent declines the offer — moves to rejected (remembers it came from "offered").
export function declineOffer(id: string) {
  patchSubmission(id, { stage: "rejected", offerResponse: "declined", prevStage: "offered" });
}

export function confirmBooked(id: string, message?: string) {
  const sub = getSubmission(id);
  patchSubmission(id, { stage: "booked", proMessage: message, prevStage: sub?.stage });
}
export function rejectSubmission(id: string, message?: string) {
  const sub = getSubmission(id);
  // Remember where they were so Reopen can restore it (unless already tracked)
  const prev = sub && sub.stage !== "rejected" ? sub.stage : sub?.prevStage;
  patchSubmission(id, { stage: "rejected", proMessage: message, prevStage: prev });
}
export function reopenSubmission(id: string) {
  const sub = getSubmission(id);
  if (!sub) return;
  // Restore the remembered stage; fall back to submitted/invited by tape state.
  const restored: Stage = sub.prevStage ?? (sub.tapes.length > 0 ? "submitted" : "invited");
  patchSubmission(id, {
    stage: restored,
    prevStage: undefined,
    // If restoring into "offered", reset the offer to pending so it's actionable again.
    offerResponse: restored === "offered" ? "pending" : undefined,
  });
}

// === Tape comments (time-coded notes) ===
export function addTapeComment(submissionId: string, tapeRound: number, timeSec: number, text: string) {
  const list = loadSubmissions();
  const idx = list.findIndex((s) => s.id === submissionId);
  if (idx === -1) return;
  const comment: TapeComment = {
    id: uid("c"),
    tapeRound,
    timeSec,
    text,
    createdAt: new Date().toISOString(),
  };
  list[idx] = { ...list[idx], comments: [...(list[idx].comments ?? []), comment] };
  safeSave(KEY_S, list);
}
export function removeTapeComment(submissionId: string, commentId: string) {
  const list = loadSubmissions();
  const idx = list.findIndex((s) => s.id === submissionId);
  if (idx === -1) return;
  list[idx] = { ...list[idx], comments: (list[idx].comments ?? []).filter((c) => c.id !== commentId) };
  safeSave(KEY_S, list);
}

// === Talent-side helpers ===
// Audition inbox: every submission for a given talent, joined with role + project info.
export function getAuditionsForTalent(talentId: string) {
  const subs = loadSubmissions().filter((s) => s.talentId === talentId);
  const rolesById: Record<string, Role> = Object.fromEntries(loadRoles().map((r) => [r.id, r]));
  const projsById: Record<string, Project> = Object.fromEntries(loadProjects().map((p) => [p.id, p]));
  return subs.map((s) => ({
    submission: s,
    role: rolesById[s.roleId],
    project: rolesById[s.roleId] ? projsById[rolesById[s.roleId].projectId] : undefined,
  })).filter((x) => x.role && x.project);
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
    tapeBlobKey: tape.tapeBlobKey,
    submittedAt: tape.submittedAt ?? new Date().toISOString(),
  };
  // Tape-mode callback: a new tape arriving auto-completes the callback.
  // After that the pro can move to hold/offer/book.
  const autoCompleteCallback =
    sub.stage === "callback" && sub.callbackType === "tape" && !sub.callbackCompleted;
  list[idx] = {
    ...sub,
    tapes: [...sub.tapes, next],
    // Stay in "callback" stage if we're auto-completing it; otherwise move to "submitted"
    stage: autoCompleteCallback ? "callback" : "submitted",
    callbackCompleted: autoCompleteCallback ? true : sub.callbackCompleted,
  };
  safeSave(KEY_S, list);
}

// Store an Aria analysis result on a specific tape round
export function setTapeAnalysis(submissionId: string, round: number, analysis: TapeAnalysis) {
  const list = loadSubmissions();
  const idx = list.findIndex((s) => s.id === submissionId);
  if (idx === -1) return;
  const sub = list[idx];
  const newTapes = sub.tapes.map((t) =>
    t.round === round ? { ...t, ariaAnalysis: analysis } : t
  );
  list[idx] = { ...sub, tapes: newTapes };
  safeSave(KEY_S, list);
}

// === Action Inbox helpers ===
// Returns cross-project, time-sensitive items grouped by urgency category.
export type InboxItem = {
  submission: Submission;
  role: Role;
  project: Project;
  reason: "to_review" | "hold_expiring" | "hold_expired" | "avail_waiting" | "offer_pending" | "deadline_today" | "deadline_passed";
  urgencyMs?: number;
};

export function loadInbox(): InboxItem[] {
  const subs = loadSubmissions();
  const rolesById = Object.fromEntries(loadRoles().map((r) => [r.id, r])) as Record<string, Role>;
  const projsById = Object.fromEntries(loadProjects().map((p) => [p.id, p])) as Record<string, Project>;
  const out: InboxItem[] = [];
  const now = Date.now();
  const H24 = 86_400_000;

  for (const s of subs) {
    const role = rolesById[s.roleId];
    const project = role ? projsById[role.projectId] : undefined;
    if (!role || !project) continue;

    // Skip closed projects
    if (project.status === "closed") continue;

    // 1) Tapes to review
    if (s.stage === "submitted") {
      out.push({
        submission: s,
        role,
        project,
        reason: "to_review",
        urgencyMs: now - +new Date(s.tapes.at(-1)?.submittedAt ?? s.createdAt),
      });
      continue;
    }

    // 2) Holds with timers
    if (s.stage === "hold" && s.holdUntil) {
      const until = +new Date(s.holdUntil);
      const diff = until - now;
      if (diff <= 0) {
        out.push({ submission: s, role, project, reason: "hold_expired", urgencyMs: -diff });
        continue;
      }
      if (diff <= H24) {
        out.push({ submission: s, role, project, reason: "hold_expiring", urgencyMs: diff });
        continue;
      }
    }

    // 3) Avail checks waiting on talent response
    if (s.stage === "avail_check") {
      out.push({
        submission: s,
        role,
        project,
        reason: "avail_waiting",
        urgencyMs: s.decidedAt ? now - +new Date(s.decidedAt) : undefined,
      });
      continue;
    }

    // 4) Offers extended, awaiting acceptance
    if (s.stage === "offered") {
      out.push({
        submission: s,
        role,
        project,
        reason: "offer_pending",
        urgencyMs: s.decidedAt ? now - +new Date(s.decidedAt) : undefined,
      });
      continue;
    }

    // 5) Invited with passed/imminent deadline
    if (s.stage === "invited" && s.inviteDeadline) {
      const d = +new Date(s.inviteDeadline);
      const diff = d - now;
      if (diff < 0) {
        out.push({ submission: s, role, project, reason: "deadline_passed", urgencyMs: -diff });
      } else if (diff <= H24) {
        out.push({ submission: s, role, project, reason: "deadline_today", urgencyMs: diff });
      }
    }
  }

  // Urgency ordering: expired > hold expiring > to review > others
  const order: Record<InboxItem["reason"], number> = {
    hold_expired: 0,
    deadline_passed: 1,
    hold_expiring: 2,
    deadline_today: 3,
    to_review: 4,
    avail_waiting: 5,
    offer_pending: 6,
  };
  return out.sort((a, b) => order[a.reason] - order[b.reason]);
}

// All currently-reviewable submissions across active projects, oldest first
// (for triage mode — sweep top-to-bottom by FIFO).
export function loadTriageQueue(): { submission: Submission; role: Role; project: Project }[] {
  const subs = loadSubmissions().filter((s) => s.stage === "submitted");
  const rolesById = Object.fromEntries(loadRoles().map((r) => [r.id, r])) as Record<string, Role>;
  const projsById = Object.fromEntries(loadProjects().map((p) => [p.id, p])) as Record<string, Project>;
  const out: { submission: Submission; role: Role; project: Project }[] = [];
  for (const s of subs) {
    const role = rolesById[s.roleId];
    const project = role ? projsById[role.projectId] : undefined;
    if (!role || !project || project.status === "closed") continue;
    out.push({ submission: s, role, project });
  }
  return out.sort((a, b) => {
    const ta = +new Date(a.submission.tapes.at(-1)?.submittedAt ?? a.submission.createdAt);
    const tb = +new Date(b.submission.tapes.at(-1)?.submittedAt ?? b.submission.createdAt);
    return ta - tb; // oldest first
  });
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
