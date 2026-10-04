import type { ReactNode } from "react";

import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** JavaScript Browser Information runs full screen like an installed iOS app. */
export default function JavascriptLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <NativeToolLayout
      href="/javascript"
      tintClassName="[--ios-tint:#e07a00] dark:[--ios-tint:#ff9f0a]"
    >
      {children}
    </NativeToolLayout>
  );
}
