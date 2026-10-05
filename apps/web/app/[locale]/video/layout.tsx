import type { ReactNode } from "react";

import { getVideoTranslator } from "../../../messages/video/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** The video editor runs full screen like an installed iOS app. */
export default async function VideoLayout({ children }: Readonly<{ children: ReactNode }>) {
  const translate = await getVideoTranslator(await getRequestLocale());

  return (
    <NativeToolLayout
      href="/video"
      tintClassName="[--ios-tint:#ff9f0a] dark:[--ios-tint:#ffb340]"
      title={translate("Video Editor")}
      contentWidth="64rem"
    >
      {children}
    </NativeToolLayout>
  );
}
