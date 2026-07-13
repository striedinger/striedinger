import type { ReactNode } from "react";

import { getRequestAccentColor } from "../app/get-request-accent-color";
import { getRequestLocale } from "../app/get-request-locale";

interface RequestLocaleBoundaryProps {
  children: ReactNode;
}

export async function RequestLocaleBoundary({ children }: RequestLocaleBoundaryProps) {
  const [locale, accentColor] = await Promise.all([getRequestLocale(), getRequestAccentColor()]);

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang=${JSON.stringify(locale)};document.documentElement.dataset.accent=${JSON.stringify(accentColor.id)};document.documentElement.style.setProperty("--accent-hue",${JSON.stringify(String(accentColor.hue))});document.documentElement.style.setProperty("--accent-chroma",${JSON.stringify(String(accentColor.chroma))})`,
        }}
      />
      {children}
    </>
  );
}
