"use client";

// PWA install support: captures the browser's install prompt (Android /
// desktop Chrome / Edge) and detects iOS Safari, where installing is manual
// ("Share → Add to Home Screen").

import { useCallback, useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: BIPEvent | null = null;
const subs = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    subs.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    subs.forEach((f) => f());
  });
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    // Running inside the native (Capacitor) shell
    !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  );
}

export function useInstallPrompt() {
  const [, force] = useState(0);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const f = () => force((n) => n + 1);
    subs.add(f);
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    setIosHint(isIOS && !isStandalone());
    return () => { subs.delete(f); };
  }, []);

  const prompt = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    try { await deferred.userChoice; } catch {}
    deferred = null;
    force((n) => n + 1);
  }, []);

  return { canInstall: !!deferred && !isStandalone(), iosHint, prompt };
}
