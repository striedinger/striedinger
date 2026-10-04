import type { ReactNode } from "react";

import { getIpTranslator } from "../../../messages/ip/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** IP Address Information runs full screen like an installed iOS app. */
export default async function IpLayout({ children }: Readonly<{ children: ReactNode }>) {
  const translate = await getIpTranslator(await getRequestLocale());

  return (
    <NativeToolLayout
      href="/ip"
      tintClassName="[--ios-tint:#0a84c7] dark:[--ios-tint:#40c8e0]"
      title={translate("IP Address Information")}
    >
      {children}
    </NativeToolLayout>
  );
}
