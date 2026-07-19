import type { ReactNode } from "react";

import { Suspense } from "react";

import { AppNavigation } from "../components/app-navigation";
import { AppNavigationSkeleton } from "../components/app-navigation-skeleton";
import { getTranslator } from "../messages/get-translator";
import { getRequestLocale } from "./get-request-locale";
import { getRequestTheme } from "./get-request-theme";

interface ToolLayoutProps {
  children: ReactNode;
}

export function ToolLayout({ children }: ToolLayoutProps) {
  return (
    <>
      <Suspense fallback={<AppNavigationSkeleton />}>
        <LocalizedAppNavigation />
      </Suspense>
      {children}
    </>
  );
}

async function LocalizedAppNavigation() {
  const [locale, theme] = await Promise.all([getRequestLocale(), getRequestTheme()]);
  const translate = await getTranslator(locale);

  return (
    <AppNavigation
      locale={locale}
      theme={theme.id}
      labels={{
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
        theme: translate("Theme"),
      }}
    />
  );
}
