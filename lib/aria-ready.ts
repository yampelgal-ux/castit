"use client";
import { useEffect, useState } from "react";

let cached: Promise<boolean> | null = null;

/** True once we know the server has an Aria (Claude API) key. */
export function useAriaReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    cached ??= fetch("/api/aria/status").then((r) => r.json()).then((d) => !!d.ready).catch(() => false);
    let live = true;
    void cached.then((v) => { if (live) setReady(v); });
    return () => { live = false; };
  }, []);
  return ready;
}
