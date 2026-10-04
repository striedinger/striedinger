import type { ReactNode } from "react";

import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** The PDF optimizer runs full screen like an installed iOS app. */
export default function PdfLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <NativeToolLayout href="/pdf" tintClassName="[--ios-tint:#ff3b30] dark:[--ios-tint:#ff453a]">
      {children}
    </NativeToolLayout>
  );
}
