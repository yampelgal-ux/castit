import { ImageResponse } from "next/og";

export const alt = "CastIt — Where talent meets opportunity";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A0A0B",
          display: "flex",
          flexDirection: "column",
          padding: 80,
          position: "relative",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background:
              "linear-gradient(90deg, #C9954A 0%, transparent 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 80% 50%, rgba(201,149,74,0.08) 0%, transparent 60%)",
          }}
        />

        <div
          style={{
            fontSize: 22,
            letterSpacing: 6,
            color: "#C9954A",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 24,
            display: "flex",
          }}
        >
          Where talent meets opportunity
        </div>

        <div
          style={{
            fontSize: 200,
            fontWeight: 900,
            letterSpacing: -8,
            color: "#F2EEE8",
            lineHeight: 0.95,
            display: "flex",
          }}
        >
          Cast<span style={{ color: "#C9954A" }}>It</span>
        </div>

        <div
          style={{
            width: 80,
            height: 3,
            background: "#C9954A",
            marginTop: 32,
            marginBottom: 24,
          }}
        />

        <div
          style={{
            fontSize: 32,
            color: "#B8B4AE",
            lineHeight: 1.4,
            maxWidth: 800,
            fontFamily: "sans-serif",
            fontWeight: 300,
            display: "flex",
          }}
        >
          The social platform for actors, models, and casting professionals.
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 80,
            right: 80,
            fontSize: 16,
            color: "#504D4A",
            letterSpacing: 3,
            textTransform: "uppercase",
            fontFamily: "sans-serif",
            fontWeight: 600,
            display: "flex",
          }}
        >
          castit
        </div>
      </div>
    ),
    { ...size }
  );
}
