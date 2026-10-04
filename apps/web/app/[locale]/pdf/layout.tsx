import type { ReactNode } from "react";

import { getPdfTranslator } from "../../../messages/pdf/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** The PDF optimizer runs full screen like an installed iOS app. */
export default async function PdfLayout({ children }: Readonly<{ children: ReactNode }>) {
  const translate = await getPdfTranslator(await getRequestLocale());

  return (
    <NativeToolLayout
      href="/pdf"
      tintClassName="[--ios-tint:#ff3b30] dark:[--ios-tint:#ff453a]"
      title={translate("PDF Optimizer")}
      contentWidth="48rem"
    >
      {children}
    </NativeToolLayout>
  );
}
