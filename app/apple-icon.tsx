import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse at 70% 30%, rgba(201,149,74,0.15) 0%, #0A0A0B 70%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background:
              "linear-gradient(90deg, #C9954A 0%, transparent 100%)",
          }}
        />
        <div
          style={{
            fontSize: 110,
            fontFamily: "serif",
            fontWeight: 900,
            letterSpacing: "-6px",
            color: "#F2EEE8",
            display: "flex",
            lineHeight: 1,
          }}
        >
          C<span style={{ color: "#C9954A" }}>i</span>t
        </div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: 4,
            color: "#C9954A",
            marginTop: 8,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          CASTIT
        </div>
      </div>
    ),
    { ...size }
  );
}
