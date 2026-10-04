import type { ReactNode } from "react";

import { NativeToolLayout, nativeToolViewport } from "../native-tool-layout";

export const viewport = nativeToolViewport;

/** The link card maker runs full screen like an installed iOS app. */
export default function CardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <NativeToolLayout href="/card" tintClassName="[--ios-tint:#5856d6] dark:[--ios-tint:#5e5ce6]">
      {children}
    </NativeToolLayout>
  );
}
