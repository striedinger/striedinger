import type { ReactNode } from "react";

import { getJsonTranslator } from "../../../messages/json/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** The JSON validator runs full screen like an installed iOS app. */
export default async function JsonLayout({ children }: Readonly<{ children: ReactNode }>) {
  const translate = await getJsonTranslator(await getRequestLocale());

  return (
    <NativeToolLayout
      href="/json"
      tintClassName="[--ios-tint:#007aff] dark:[--ios-tint:#0a84ff]"
      title={translate("JSON Validator and Formatter")}
      contentWidth="64rem"
    >
      {children}
    </NativeToolLayout>
  );
}
