import type { ReactNode } from "react";

import { AppNavigation } from "../components/app-navigation";
import { getTranslator } from "../messages/get-translator";
import { getRequestLocale } from "./get-request-locale";

interface ToolLayoutProps {
  children: ReactNode;
}

export async function ToolLayout({ children }: ToolLayoutProps) {
  const locale = await getRequestLocale();
  const translate = await getTranslator(locale);

  return (
    <>
      <AppNavigation
        locale={locale}
        labels={{
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
