import type { ReactNode } from "react";

import { ToolLayout } from "../tool-layout";

export default function ChatLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ToolLayout>{children}</ToolLayout>;
}
