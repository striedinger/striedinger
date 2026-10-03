import type { Locale } from "@workspace/i18n";

import type { IosAppSwitcherLabels } from "./ios-app-switcher-context";

import { getTranslator } from "../../messages/get-translator";

/** The app switcher's strings, translated on the server by each native app's layout. */
export async function getAppSwitcherLabels(locale: Locale): Promise<IosAppSwitcherLabels> {
  const translate = await getTranslator(locale);

  return {
    apps: translate("Apps"),
    chat: translate("Nearby Chat"),
    close: translate("Close navigation"),
    home: translate("Home"),
    image: translate("Image Optimizer"),
    ip: translate("IP Address Information"),
    javascript: translate("JavaScript Browser Information"),
    json: translate("JSON Validator and Formatter"),
    navigation: translate("Navigation"),
    notes: translate("Notes"),
    og: translate("Open Graph Preview"),
    open: translate("Open apps menu"),
    pdf: translate("PDF Optimizer"),
    podcasts: translate("Podcasts"),
    stocks: translate("Stocks"),
    sudoku: translate("Sudoku"),
    tools: translate("Tools"),
    trains: translate("Trains"),
  };
}
