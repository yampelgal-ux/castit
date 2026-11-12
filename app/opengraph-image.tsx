import { ImageResponse } from "next/og";

// The picture shown when a CastIt link is shared. Matches the black + yellow
// "Call Sheet" look. English only: the image renderer has no Hebrew font.
export const alt = "CastIt — Where talent meets opportunity";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#FAF9F5", display: "flex", flexDirection: "column", justifyContent: "center", padding: 90, position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18, background: "#FFD43B", borderBottom: "6px solid #111" }} />
        <div style={{ fontSize: 26, letterSpacing: 8, color: "#111", textTransform: "uppercase", fontWeight: 700, display: "flex", marginBottom: 28 }}>
          Auditions · Self-tapes · Casting
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", fontSize: 210, fontWeight: 900, letterSpacing: -10, color: "#111", lineHeight: 0.9 }}>
          <span style={{ display: "flex" }}>Cast</span>
          <span style={{ display: "flex", background: "#FFD43B", padding: "0 18px", marginLeft: 8 }}>It</span>
        </div>
        <div style={{ fontSize: 40, color: "#3D3D3D", marginTop: 44, display: "flex", maxWidth: 900, lineHeight: 1.3 }}>
          Where actors and casting directors meet.
        </div>
        <div style={{ position: "absolute", bottom: 70, right: 90, fontSize: 22, color: "#111", letterSpacing: 4, textTransform: "uppercase", fontWeight: 700, display: "flex" }}>
          castit
        </div>
      </div>
    ),
    { ...size },
  );
}
