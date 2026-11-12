import { NextResponse, type NextRequest } from "next/server";
import { isCloudConfigured } from "@/lib/cloud/config";

// Screens that still run on demo data only (fake stats, local-only posts, or
// Aria features waiting for an API key). With a real backend they would show
// made-up content, so send people to their home screen instead.
const UNFINISHED: Record<string, string> = {
  "/opportunities": "/feed",
  "/practice": "/feed",
  "/avatar": "/feed",
  "/casting-pro": "/feed",
  "/verify": "/settings",
  "/pro/sourcing": "/pro/search",
  "/pro/audition/new": "/pro/projects",
};

export function middleware(req: NextRequest) {
  if (!isCloudConfigured()) return NextResponse.next();
  const to = UNFINISHED[req.nextUrl.pathname.replace(/\/$/, "")];
  if (!to) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = to;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/opportunities", "/practice", "/avatar", "/casting-pro", "/verify", "/pro/sourcing", "/pro/audition/new"],
};
