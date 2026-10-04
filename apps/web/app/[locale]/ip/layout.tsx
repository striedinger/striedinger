import type { ReactNode } from "react";

import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** IP Address Information runs full screen like an installed iOS app. */
export default function IpLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <NativeToolLayout href="/ip" tintClassName="[--ios-tint:#0a84c7] dark:[--ios-tint:#40c8e0]">
      {children}
    </NativeToolLayout>
  );
}
