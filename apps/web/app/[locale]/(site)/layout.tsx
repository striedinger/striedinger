import type { ReactNode } from "react";

import "./site.css";

/** Pages outside the native apps, which load the site stylesheet instead of the apps' one. */
export default function SiteLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
