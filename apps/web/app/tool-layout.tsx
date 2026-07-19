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
          chat: translate("Nearby Chat"),
          close: translate("Close navigation"),
          drop: translate("Drop - Private file sharing"),
          json: translate("JSON Validator and Formatter"),
          image: translate("Image Optimizer"),
          menu: translate("Open navigation menu"),
          navigation: translate("Navigation"),
          og: translate("Open Graph Preview"),
          podcasts: translate("Podcasts"),
          pdf: translate("PDF Optimizer"),
          selectLanguage: translate("Select language"),
          stocks: translate("Stock watchlist"),
          subway: translate("Trains near you"),
          sudoku: translate("Daily Sudoku"),
        }}
      />
      {children}
    </>
  );
}
