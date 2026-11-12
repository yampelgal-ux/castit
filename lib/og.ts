import type { Metadata } from "next";

// Link previews (WhatsApp, iMessage…) are read from the server-rendered page,
// so these run on the server with the public key and only read public data.

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function rest<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!URL_ || !KEY || /placeholder/i.test(URL_)) return null;
  try {
    const r = await fetch(`${URL_}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json" },
      next: { revalidate: 300 },
    });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** Preview for an invite / open audition link. */
export async function inviteMetadata(code: string): Promise<Metadata> {
  const d = await rest<any>("rpc/get_public_link", { method: "POST", body: JSON.stringify({ p_slug: code }) });
  if (!d || d.code !== code || !d.role?.name) return { title: "הזמנה לאודישן · CastIt" };
  const title = `אודישן: ${d.role.name}${d.project?.title ? ` · ${d.project.title}` : ""}`;
  const by = d.studio || d.proName;
  const description = clip([by ? `מאת ${by}.` : "", d.role.description || d.message || "הגשת סלף-טייפ דרך CastIt."].filter(Boolean).join(" "), 180);
  return { title, description, openGraph: { title, description, siteName: "CastIt", type: "website" }, twitter: { card: "summary_large_image", title, description } };
}

/** Preview for a public actor profile. Only cards the actor published (minors without consent have none). */
export async function profileMetadata(username: string): Promise<Metadata> {
  if (!/^[\w.-]{1,40}$/.test(username) || username === "me") return {};
  const rows = await rest<{ name: string | null; talent_card: any }[]>(
    `profiles?select=name,talent_card&username=eq.${encodeURIComponent(username)}&limit=1`,
  );
  const p = rows?.[0];
  const card = p?.talent_card;
  if (!p || !card) return {};
  const name = p.name || `@${username}`;
  const title = `${name} · CastIt`;
  const description = clip(card.bio || "פרופיל שחקן/ית ב-CastIt: תמונות, סרטונים ומאפיינים.", 180);
  const photo = typeof card.photo === "string" && card.photo.startsWith("https://") ? card.photo : undefined;
  return {
    title, description,
    openGraph: { title, description, siteName: "CastIt", type: "profile", ...(photo ? { images: [{ url: photo, alt: name }] } : {}) },
    twitter: { card: photo ? "summary_large_image" : "summary", title, description },
  };
}
