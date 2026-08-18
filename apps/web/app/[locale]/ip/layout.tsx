import type { ReactNode } from "react";

import { ToolLayout } from "../../tool-layout";

export default function LocalizedIpAddressLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ToolLayout>{children}</ToolLayout>;
}
