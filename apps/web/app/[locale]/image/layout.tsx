import type { ReactNode } from "react";

import { getImageTranslator } from "../../../messages/image/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** The image optimizer runs full screen like an installed iOS app. */
export default async function ImageLayout({ children }: Readonly<{ children: ReactNode }>) {
  const translate = await getImageTranslator(await getRequestLocale());

  return (
    <NativeToolLayout
      href="/image"
      tintClassName="[--ios-tint:#ff2d55] dark:[--ios-tint:#ff375f]"
      title={translate("Image Optimizer")}
      contentWidth="42rem"
    >
      {children}
    </NativeToolLayout>
  );
}
