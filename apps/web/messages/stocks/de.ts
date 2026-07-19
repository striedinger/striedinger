import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";
export const messages: TranslationCatalog<typeof englishMessages> = {
  "Stock watchlist": "Aktien-Watchlist",
  "Search, save, and explore market trends across multiple timeframes.":
    "Aktien suchen, speichern und Markttrends über mehrere Zeiträume erkunden.",
  "Search stocks": "Aktien suchen",
  "Search by company or ticker": "Nach Unternehmen oder Kürzel suchen",
  "Type a company name or symbol. Use arrow keys to browse results.":
    "Unternehmen oder Kürzel eingeben. Ergebnisse mit den Pfeiltasten durchsuchen.",
  Watchlist: "Watchlist",
  "Your watchlist is empty. Search for a stock to begin.":
    "Deine Watchlist ist leer. Suche zum Start nach einer Aktie.",
  Add: "Hinzufügen",
  Added: "Hinzugefügt",
  "After hours": "Nachbörslich",
  Remove: "Entfernen",
  Close: "Schließen",
  "Link copied": "Link kopiert",
  "Share chart": "Chart teilen",
  "Drag across the chart to select a range": "Ziehe über den Chart, um einen Bereich auszuwählen",
  "Reset zoom": "Zoom zurücksetzen",
  Chart: "Chart",
  "Drag across the chart or use the left and right arrow keys to inspect prices.":
    "Über den Chart ziehen oder mit den Pfeiltasten Kurse prüfen.",
  "Loading market data": "Marktdaten werden geladen",
  "Market data is temporarily unavailable. Try another timeframe or stock.":
    "Marktdaten sind vorübergehend nicht verfügbar. Versuche einen anderen Zeitraum oder eine andere Aktie.",
  "Demo data": "Demodaten",
  Price: "Kurs",
  Open: "Eröffnung",
  High: "Hoch",
  Low: "Tief",
  "Market closed": "Markt geschlossen",
  "Market open": "Markt geöffnet",
  "Pre-market": "Vorbörslich",
  Volume: "Volumen",
  "Market data provided by Twelve Data. Quotes may be delayed and are for informational purposes only.":
    "Marktdaten von Twelve Data. Kurse können verzögert sein und dienen nur zur Information.",
};
