import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "CastIt — Where talent meets opportunity",
    short_name: "CastIt",
    description:
      "The casting platform for actors, casting directors and talent agencies.",
    start_url: "/welcome?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#0B0B0B",
    theme_color: "#0B0B0B",
    lang: "he",
    dir: "auto",
    categories: ["entertainment", "business", "social"],
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Audition inbox", short_name: "Inbox", url: "/inbox", icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }] },
      { name: "Pro dashboard", short_name: "Pro", url: "/pro/dashboard", icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }] },
      { name: "Talent search", short_name: "Search", url: "/pro/search", icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
