import type { ReactNode } from "react";

import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** The image optimizer runs full screen like an installed iOS app. */
export default function ImageLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <NativeToolLayout href="/image" tintClassName="[--ios-tint:#ff2d55] dark:[--ios-tint:#ff375f]">
      {children}
    </NativeToolLayout>
  );
}
