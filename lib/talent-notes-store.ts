"use client";

// Private notes + tags about a talent — visible ONLY to the pro who wrote them.
// Tags are arbitrary strings the pro creates ("Hold list", "Strong reader", "July avail").

export type AgentContact = {
  name: string;
  email?: string;
  phone?: string;
  agency?: string;
};

export type TalentNote = {
  talentId: string;
  note: string;
  tags: string[];
  agent?: AgentContact;
  updatedAt: string;
};

const KEY = "castit_talent_notes_v1";

function safeLoad(): Record<string, TalentNote> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch { return {}; }
}

function safeSave(data: Record<string, TalentNote>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getTalentNote(talentId: string): TalentNote {
  const all = safeLoad();
  return all[talentId] ?? { talentId, note: "", tags: [], updatedAt: "" };
}

export function setTalentNote(talentId: string, note: string, tags: string[]) {
  const all = safeLoad();
  const existing = all[talentId] ?? { talentId, note: "", tags: [], updatedAt: "" };
  all[talentId] = { ...existing, talentId, note, tags, updatedAt: new Date().toISOString() };
  safeSave(all);
}

export function setTalentAgent(talentId: string, agent: AgentContact | null) {
  const all = safeLoad();
  const existing = all[talentId] ?? { talentId, note: "", tags: [], updatedAt: "" };
  all[talentId] = {
    ...existing,
    talentId,
    agent: agent ?? undefined,
    updatedAt: new Date().toISOString(),
  };
  safeSave(all);
}

export function getAllTags(): string[] {
  const all = safeLoad();
  const tags = new Set<string>();
  Object.values(all).forEach((n) => n.tags.forEach((t) => tags.add(t)));
  return [...tags].sort();
}

export function getTalentsByTag(tag: string): string[] {
  const all = safeLoad();
  return Object.values(all).filter((n) => n.tags.includes(tag)).map((n) => n.talentId);
}
