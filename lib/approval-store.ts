"use client";

// Director Approval Sessions — pro bundles N submissions (tapes), shares a
// public link with the director/producer, and the director votes 👍 / 🤔 / 👎
// on each tape. Votes sync back into the pro's pipeline view.

export type ApprovalVote = "yes" | "maybe" | "no";

export type ApprovalTalent = {
  submissionId: string;
  talentId: string;
  talentName: string;
  talentPhoto: string;
  roleName: string;
  tapeBlobKey?: string;     // resolves video from IDB
  tapeUrl?: string;         // fallback URL
  vote?: ApprovalVote;
  voteNote?: string;
  voterName?: string;
  votedAt?: string;
};

export type ApprovalSession = {
  id: string;
  slug: string;
  proName?: string;
  projectTitle: string;
  roleName?: string;
  greeting?: string;        // intro line from the pro to the director
  talents: ApprovalTalent[];
  createdAt: string;
  expiresAt?: string;
  views: { at: string }[];
};

const KEY = "castit_approval_sessions_v1";

function safeLoad(): ApprovalSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ApprovalSession[]) : [];
  } catch { return []; }
}

function safeSave(list: ApprovalSession[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

function uid(): string {
  return "ap-" + Math.random().toString(36).slice(2, 9);
}

function slug(): string {
  return Math.random().toString(36).slice(2, 7) + Math.random().toString(36).slice(2, 7);
}

export function loadApprovalSessions(): ApprovalSession[] {
  return safeLoad().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function getApprovalSession(id: string): ApprovalSession | undefined {
  return safeLoad().find((s) => s.id === id);
}

export function getApprovalBySlug(s: string): ApprovalSession | undefined {
  return safeLoad().find((p) => p.slug === s);
}

export function createApprovalSession(input: {
  proName?: string;
  projectTitle: string;
  roleName?: string;
  greeting?: string;
  talents: Omit<ApprovalTalent, "vote" | "voteNote" | "voterName" | "votedAt">[];
  expiresAt?: string;
}): ApprovalSession {
  const list = safeLoad();
  const sess: ApprovalSession = {
    id: uid(),
    slug: slug(),
    proName: input.proName,
    projectTitle: input.projectTitle,
    roleName: input.roleName,
    greeting: input.greeting,
    talents: input.talents.map((t) => ({ ...t })),
    createdAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
    views: [],
  };
  list.unshift(sess);
  safeSave(list);
  return sess;
}

export function logApprovalView(s: string) {
  const list = safeLoad();
  const idx = list.findIndex((x) => x.slug === s);
  if (idx === -1) return;
  list[idx] = { ...list[idx], views: [...list[idx].views, { at: new Date().toISOString() }] };
  safeSave(list);
}

export function castVote(slug: string, submissionId: string, vote: ApprovalVote, voterName?: string, voteNote?: string) {
  const list = safeLoad();
  const idx = list.findIndex((x) => x.slug === slug);
  if (idx === -1) return;
  const sess = list[idx];
  const talents = sess.talents.map((t) =>
    t.submissionId === submissionId
      ? { ...t, vote, voterName, voteNote, votedAt: new Date().toISOString() }
      : t
  );
  list[idx] = { ...sess, talents };
  safeSave(list);
}

export function deleteApprovalSession(id: string) {
  safeSave(safeLoad().filter((s) => s.id !== id));
}

export function isExpired(s: ApprovalSession): boolean {
  if (!s.expiresAt) return false;
  return +new Date(s.expiresAt) < Date.now();
}
