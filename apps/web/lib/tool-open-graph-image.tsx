import { ImageResponse } from "next/og";

export const openGraphImageSize = {
  width: 1200,
  height: 630,
};
export const openGraphImageContentType = "image/png";

interface ToolOpenGraphImageOptions {
  description: string;
  title: string;
}

export function createToolOpenGraphImage({ description, title }: ToolOpenGraphImageOptions) {
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#faf9f7",
        color: "#171717",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: "70px 76px",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          fontSize: 24,
          fontWeight: 600,
          gap: 14,
          letterSpacing: "-0.01em",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#171717",
            borderRadius: 13,
            color: "#ffffff",
            display: "flex",
            fontSize: 25,
            fontWeight: 800,
            height: 52,
            justifyContent: "center",
            width: 52,
          }}
        >
          H
        </div>
        Hugo Striedinger
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 42 ? 60 : 72,
            fontWeight: 750,
            letterSpacing: "-0.045em",
            lineHeight: 1.05,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: "#525252",
            display: "flex",
            fontSize: 30,
            lineHeight: 1.3,
            maxWidth: 960,
          }}
        >
          {description}
        </div>
      </div>

      <div style={{ color: "#737373", display: "flex", fontSize: 22 }}>striedinger.co</div>
    </div>,
    openGraphImageSize,
  );
}
