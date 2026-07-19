import type { ReactNode } from "react";

import { getRequestLocale } from "../app/get-request-locale";

interface RequestLocaleBoundaryProps {
  children: ReactNode;
}

export async function RequestLocaleBoundary({ children }: RequestLocaleBoundaryProps) {
  const locale = await getRequestLocale();

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang=${JSON.stringify(locale)}`,
        }}
      />
      {children}
    </>
  );
}
