"use client";

// Phone notifications (Supabase migration 007 + /api/push). Each phone that
// turns them on stores its push address; events then ask the server to notify
// the other person. Works on Android and desktop browsers, and on iPhone once
// CastIt is added to the home screen.

import { supabase } from "@/lib/supabase";
import { useLangStore } from "@/lib/i18n";
import { isCloudConfigured, isRealUserId } from "./config";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushStatus = "unsupported" | "needs-install" | "denied" | "off" | "on";
export type PushKind = "message" | "invite" | "callback" | "avail_check" | "offered" | "booked" | "tape" | "avail" | "offer" | "joined";

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function keyBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function pushStatus(): Promise<PushStatus> {
  if (!isCloudConfigured() || !PUBLIC_KEY) return "unsupported";
  if (isIOS() && !isStandalone()) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

export async function enablePush(): Promise<PushStatus> {
  const s = await pushStatus();
  if (s === "unsupported" || s === "needs-install" || s === "denied") return s;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "off";
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
  if (!(await saveSubscription(sub))) return "off";
  return "on";
}

async function saveSubscription(sub: PushSubscription): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const j = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert({
    endpoint: sub.endpoint, user_id: data.user.id, p256dh: j.keys?.p256dh ?? "", auth: j.keys?.auth ?? "",
    lang: useLangStore.getState().lang === "en" ? "en" : "he",
  }, { onConflict: "endpoint" });
  if (error) console.warn("[push] save", error.message);
  return !error;
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

/** Re-link this phone after signing in (another account may have used it before). */
export async function refreshPushOwner(): Promise<void> {
  if ((await pushStatus()) !== "on") return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await saveSubscription(sub);
}

/** Before signing out: this phone shouldn't keep getting the account's notifications. */
export async function forgetPushOnThisPhone(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  } catch {}
}

/** Fire-and-forget: notify another user's phones. */
export function sendPush(to: string | null | undefined, kind: PushKind, opts: { href?: string; text?: string; role?: string } = {}) {
  if (!isCloudConfigured() || !isRealUserId(to)) return;
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || data.session?.user.id === to) return;
      await fetch("/api/push", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ to, kind, href: opts.href ?? "/", text: opts.text?.slice(0, 400), role: opts.role?.slice(0, 80) }),
        keepalive: true,
      });
    } catch {}
  })();
}
