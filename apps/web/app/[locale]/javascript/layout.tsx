import type { ReactNode } from "react";

import { getJavaScriptTranslator } from "../../../messages/javascript/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** JavaScript Browser Information runs full screen like an installed iOS app. */
export default async function JavascriptLayout({ children }: Readonly<{ children: ReactNode }>) {
  const translate = await getJavaScriptTranslator(await getRequestLocale());

  return (
    <NativeToolLayout
      href="/javascript"
      tintClassName="[--ios-tint:#e07a00] dark:[--ios-tint:#ff9f0a]"
      title={translate("JavaScript Browser Information")}
    >
      {children}
    </NativeToolLayout>
  );
}
