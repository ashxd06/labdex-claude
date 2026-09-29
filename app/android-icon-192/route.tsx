import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export function GET() {
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
          backgroundSize: "24px 24px",
        }}
      >
        <div
          style={{
            width: 112,
            height: 112,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 28,
            background: "#10233a",
            border: "4px solid #2377ff",
            color: "#6de1ff",
            fontSize: 68,
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
