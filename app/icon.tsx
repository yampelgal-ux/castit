import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          background: "#0A0A0B",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#C9954A",
          fontFamily: "serif",
          fontWeight: 900,
          letterSpacing: "-1px",
        }}
      >
        C
      </div>
    ),
    { ...size }
  );
}
