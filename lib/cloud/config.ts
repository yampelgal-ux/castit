// Is a real Supabase project wired up? When not, the app runs in local demo
// mode exactly like before (everything stays in this browser).
export function isCloudConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!url && !!key && !/YOUR[_-]|placeholder/i.test(url) && !/^YOUR/.test(key);
}

/** Local demo (seeded people, projects, reels) only runs when no real backend is configured. */
export const DEMO_MODE = !isCloudConfigured();

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

// Real Supabase user ids are UUIDs; mock/demo ids are short strings ("t1", "me").
export function isRealUserId(id: string | null | undefined): id is string {
  return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// localStorage key that remembers which cloud account this device's data belongs to.
export const CLOUD_UID_KEY = "castit_cloud_uid";
