import { ImageResponse } from "next/og";

import { getTranslator } from "../messages/get-translator";
import { getRequestLocale } from "./get-request-locale";

export const alt = "Hugo Striedinger - Senior Software Engineer";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const locale = await getRequestLocale();
  const translate = await getTranslator(locale);

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#ffffff",
        color: "#111111",
        display: "flex",
        flexDirection: "column",
        fontFamily: "serif",
        height: "100%",
        justifyContent: "center",
        textAlign: "center",
        width: "100%",
      }}
    >
      <div style={{ fontSize: 72, fontWeight: 700 }}>{`${translate("Hi there!")} 👋`}</div>
      <div style={{ fontSize: 72, fontWeight: 700 }}>{translate("I'm Hugo Striedinger")}</div>
      <div style={{ fontSize: 38, marginTop: 36 }}>{translate("Senior Software Engineer")}</div>
      <div style={{ fontSize: 28, marginTop: 20 }}>SpaceX · Twitter Inc. · X Corp.</div>
    </div>,
    size,
  );
}
