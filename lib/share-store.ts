"use client";

// Curated shortlist share packets — a pro picks talents from their shortlist and
// gets a public link they can send to a director/producer. The viewer doesn't
// need an account, and only sees the talents on the packet (not the full app).

export type SharePacket = {
  id: string;
  slug: string;                 // short random token in the URL
  title: string;                // e.g. "Maya — final 4"
  note?: string;                // pro's note to the viewer ("watch tape 2 first")
  projectTitle?: string;        // optional context for the viewer
  roleName?: string;
  talentIds: string[];          // ordered list of TALENTS ids
  createdAt: string;
  expiresAt?: string;           // ISO; undefined → no expiry
  views: { at: string }[];      // timestamps when the public page was opened
};

const KEY = "castit_share_packets_v1";

function safeLoad(): SharePacket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SharePacket[]) : [];
  } catch { return []; }
}

function safeSave(list: SharePacket[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function slug(): string {
  // 10-char URL-safe slug — collision probability is negligible for this use
  return Math.random().toString(36).slice(2, 7) + Math.random().toString(36).slice(2, 7);
}

export function loadPackets(): SharePacket[] {
  return safeLoad();
}

export function getPacketBySlug(s: string): SharePacket | undefined {
  return safeLoad().find((p) => p.slug === s);
}

export function createPacket(input: {
  title: string;
  note?: string;
  projectTitle?: string;
  roleName?: string;
  talentIds: string[];
  expiresInDays?: number;
}): SharePacket {
  const list = safeLoad();
  const expiresAt = input.expiresInDays && input.expiresInDays > 0
    ? new Date(Date.now() + input.expiresInDays * 86400000).toISOString()
    : undefined;
  const packet: SharePacket = {
    id: uid(),
    slug: slug(),
    title: input.title,
    note: input.note,
    projectTitle: input.projectTitle,
    roleName: input.roleName,
    talentIds: input.talentIds,
    createdAt: new Date().toISOString(),
    expiresAt,
    views: [],
  };
  list.unshift(packet);
  safeSave(list);
  return packet;
}

export function deletePacket(id: string) {
  safeSave(safeLoad().filter((p) => p.id !== id));
}

export function logView(slug: string) {
  const list = safeLoad();
  const idx = list.findIndex((p) => p.slug === slug);
  if (idx === -1) return;
  list[idx] = { ...list[idx], views: [...list[idx].views, { at: new Date().toISOString() }] };
  safeSave(list);
}

export function isExpired(p: SharePacket): boolean {
  if (!p.expiresAt) return false;
  return new Date(p.expiresAt).getTime() < Date.now();
}
