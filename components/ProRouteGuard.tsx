"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

// Pages that don't make sense for a Casting Pro. Each maps to a Pro-friendly
// equivalent (or back to the dashboard if there's no good match).
const REDIRECTS: { match: (p: string) => boolean; to: string }[] = [
  // Talent practice & content creation
  { match: (p) => p.startsWith("/practice"),       to: "/pro/dashboard" },
  { match: (p) => p.startsWith("/studio"),         to: "/pro/dashboard" },

  // Talent's incoming audition flows
  { match: (p) => p.startsWith("/inbox"),          to: "/pro/projects" },
  { match: (p) => p === "/auditions" || p.startsWith("/auditions/"), to: "/pro/projects" },
  { match: (p) => p.startsWith("/opportunities"),  to: "/pro/projects" },
  { match: (p) => p.startsWith("/saved"),          to: "/pro/shortlist" },
  { match: (p) => p.startsWith("/typecast"),       to: "/pro/dashboard" },

  // Talent discovery surfaces — Pro has dedicated equivalents
  { match: (p) => p === "/feed",                   to: "/pro/reels" },
  { match: (p) => p.startsWith("/discover"),       to: "/pro/search" },
  { match: (p) => p.startsWith("/calendar"),       to: "/pro/calendar" },
];

// Wrap (main) layout with this — talent routes hosted under (main) are auto-redirected
// to the Pro equivalent when the user is a Casting Pro.
export function ProRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const role = useStore((s) => s.profile.role);
  const isAuthed = useStore((s) => s.isAuthed);

  useEffect(() => {
    if (!isAuthed) return;
    if (role !== "Casting Pro") return;
    const r = REDIRECTS.find((x) => x.match(pathname));
    if (r) router.replace(r.to);
  }, [role, isAuthed, pathname, router]);

  return <>{children}</>;
}
