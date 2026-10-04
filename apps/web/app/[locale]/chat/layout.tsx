import type { ReactNode } from "react";

import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** Nearby Chat runs full screen like an installed iOS app. */
export default function ChatLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <NativeToolLayout href="/chat" tintClassName="[--ios-tint:#34c759] dark:[--ios-tint:#30d158]">
      {children}
    </NativeToolLayout>
  );
}
