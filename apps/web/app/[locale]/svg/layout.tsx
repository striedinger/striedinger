import type { ReactNode } from "react";

import { getSvgTranslator } from "../../../messages/svg/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** The SVG editor runs full screen like an installed iOS app. */
export default async function SvgLayout({ children }: Readonly<{ children: ReactNode }>) {
  const translate = await getSvgTranslator(await getRequestLocale());

  return (
    <NativeToolLayout
      href="/svg"
      tintClassName="[--ios-tint:#af52de] dark:[--ios-tint:#bf5af2]"
      title={translate("SVG Editor")}
      contentWidth="64rem"
    >
      {children}
    </NativeToolLayout>
  );
}
