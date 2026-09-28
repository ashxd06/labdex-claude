import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080d14",
          backgroundImage:
            "linear-gradient(rgba(40, 179, 255, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(40, 179, 255, 0.12) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      >
        <div
          style={{
            width: 300,
            height: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 72,
            background: "#10233a",
            border: "8px solid #2377ff",
            color: "#6de1ff",
            fontSize: 184,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          ⚗
        </div>
      </div>
    ),
    size
  );
}
