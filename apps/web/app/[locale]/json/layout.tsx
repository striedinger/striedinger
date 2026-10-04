import type { ReactNode } from "react";

import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** The JSON validator runs full screen like an installed iOS app. */
export default function JsonLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <NativeToolLayout href="/json" tintClassName="[--ios-tint:#007aff] dark:[--ios-tint:#0a84ff]">
      {children}
    </NativeToolLayout>
  );
}
