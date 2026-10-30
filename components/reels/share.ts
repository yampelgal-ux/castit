"use client";

/** Share a talent's reel: native share sheet on phones, otherwise copy the link. */
export async function shareReel(username: string, caption: string, he: boolean): Promise<"shared" | "copied" | "none"> {
  const url = `${window.location.origin}/profile/${encodeURIComponent(username)}`;
  const title = caption || (he ? "סרטון ב-CastIt" : "A video on CastIt");
  try {
    if (navigator.share) { await navigator.share({ title, url }); return "shared"; }
  } catch { return "none"; }
  try { await navigator.clipboard.writeText(url); return "copied"; } catch { return "none"; }
}
