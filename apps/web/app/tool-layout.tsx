import type { ReactNode } from "react";

import { AppNavigation } from "../components/app-navigation";
import { getTranslator } from "../messages/get-translator";
import { getRequestAccentColor } from "./get-request-accent-color";
import { getRequestLocale } from "./get-request-locale";

interface ToolLayoutProps {
  children: ReactNode;
}

export async function ToolLayout({ children }: ToolLayoutProps) {
  const [locale, accentColor] = await Promise.all([getRequestLocale(), getRequestAccentColor()]);
  const translate = await getTranslator(locale);

  return (
    <>
      <AppNavigation
        accentColor={accentColor.id}
        locale={locale}
        labels={{
          accentColor: translate("Accent color"),
          close: translate("Close navigation"),
          json: translate("JSON Validator and Formatter"),
          menu: translate("Open navigation menu"),
          navigation: translate("Navigation"),
          og: translate("Open Graph Preview"),
          selectLanguage: translate("Select language"),
          subway: translate("Trains near you"),
          sudoku: translate("Daily Sudoku"),
        }}
      />
      {children}
    </>
  );
}
