import type { ReactNode } from "react";

import { getOgTranslator } from "../../../messages/og/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** Open Graph Preview runs full screen like an installed iOS app. */
export default async function OgLayout({ children }: Readonly<{ children: ReactNode }>) {
  const translate = await getOgTranslator(await getRequestLocale());

  return (
    <NativeToolLayout
      href="/og"
      tintClassName="[--ios-tint:#5856d6] dark:[--ios-tint:#5e5ce6]"
      title={translate("Open Graph Preview")}
      contentWidth="42rem"
    >
      {children}
    </NativeToolLayout>
  );
}
