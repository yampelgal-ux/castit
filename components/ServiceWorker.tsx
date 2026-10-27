"use client";
import { useEffect } from "react";

// Registers /sw.js (offline support + installable PWA). Production only, so
// local development never serves stale cached bundles.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => console.warn("[sw]", e));
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
