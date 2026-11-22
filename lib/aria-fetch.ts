"use client";
// fetch() for /api/aria/*: attaches the signed-in user's session so the server
// knows the call comes from a real CastIt account.
import { supabase } from "@/lib/supabase";
import { isCloudConfigured } from "@/lib/cloud/config";

export async function ariaFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (isCloudConfigured()) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
    } catch {}
  }
  return fetch(input, { ...init, headers });
}
