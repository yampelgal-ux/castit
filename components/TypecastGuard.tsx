"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

// Talents must complete their typecast before accessing the main app.
// The typecast IS their casting ID — without it they can't be discovered.
export function TypecastGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { isAuthed, profile } = useStore();

  useEffect(() => {
    if (!isAuthed) return;
    if (profile.role !== "Talent") return;
    if (pathname.startsWith("/pro")) return;

    const tc = profile.typecast;
    const hasCore = !!(tc.skinTone && tc.eyeColor && tc.hairColor && tc.heightCm);
    if (!hasCore) {
      router.replace("/typecast");
    }
  }, [isAuthed, profile, pathname, router]);

  return <>{children}</>;
}
