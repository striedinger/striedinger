import type { ReactNode } from "react";

import { ToolLayout } from "../tool-layout";

export default function MtaLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ToolLayout>{children}</ToolLayout>;
}
