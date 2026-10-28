import { ImageResponse } from "next/og";

import { getListeningTranslator } from "../../../messages/listening/get-translator";
import { getRouteLocale } from "../../get-request-locale";
import { listeningImageSize } from "./listening-image";

interface OpenGraphImageProps {
  params: Promise<{ locale: string }>;
}

export const alt = "Press play to see what Hugo is listening to on Spotify";
export const size = listeningImageSize;
export const contentType = "image/png";

const equalizerBarHeights = [14, 26, 18, 30];
const glassFill = "rgba(255, 255, 255, 0.16)";
const glassEdge = "inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.18)";

/**
 * The card image before the live page loads. X draws a play button over its center, so the
 * words stay in the left column and the right side carries only artwork-like glass.
 */
export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const translate = await getListeningTranslator(await getRouteLocale(params));

  return new ImageResponse(
    <div
      style={{
        background:
          "radial-gradient(circle at 78% 26%, #ffb36b 0%, #ff6a5c 22%, rgba(255, 106, 92, 0) 52%), radial-gradient(circle at 12% 92%, #5a2bd8 0%, rgba(90, 43, 216, 0) 60%), linear-gradient(155deg, #1b1446 0%, #4a1a7a 45%, #c2306a 80%, #ff8a4c 100%)",
        color: "#ffffff",
        display: "flex",
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      {[420, 300, 180].map(function renderDisc(diameter) {
        return (
          <div
            key={diameter}
            style={{
              background: glassFill,
              borderRadius: diameter,
              boxShadow: glassEdge,
              display: "flex",
              height: diameter,
              left: 960 - diameter / 2,
              position: "absolute",
              top: 360 - diameter / 2,
              width: diameter,
            }}
          />
        );
      })}

      <div
        style={{
          alignItems: "center",
          display: "flex",
          fontSize: 26,
          fontWeight: 600,
          gap: 14,
          left: 80,
          position: "absolute",
          top: 72,
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: glassFill,
            borderRadius: 14,
            boxShadow: glassEdge,
            display: "flex",
            fontSize: 26,
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

      <div
        style={{
          bottom: 80,
          display: "flex",
          flexDirection: "column",
          gap: 30,
          left: 80,
          position: "absolute",
          width: 460,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 66,
            fontWeight: 750,
            letterSpacing: "-0.04em",
            lineHeight: 1.04,
          }}
        >
          {translate("What’s Hugo listening to right now?")}
        </div>
        <div
          style={{
            alignItems: "center",
            alignSelf: "flex-start",
            background: glassFill,
            borderRadius: 40,
            boxShadow: glassEdge,
            display: "flex",
            fontSize: 28,
            fontWeight: 600,
            gap: 16,
            height: 64,
            padding: "0 28px 0 24px",
          }}
        >
          <div style={{ alignItems: "flex-end", display: "flex", gap: 4, height: 30 }}>
            {equalizerBarHeights.map(function renderBar(height) {
              return (
                <div
                  key={height}
                  style={{ background: "#1ed760", borderRadius: 3, height, width: 6 }}
                />
              );
            })}
          </div>
          {translate("Press play to see")}
        </div>
      </div>
    </div>,
    listeningImageSize,
  );
}
