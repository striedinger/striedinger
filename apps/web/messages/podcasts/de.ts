import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages = {
  Add: "Hinzufügen",
  Added: "Hinzugefügt",
  "Back to shows": "Zurück zu den Sendungen",
  Cancel: "Abbrechen",
  "Close player": "Player schließen",
  "Cover art": "Cover",
  "Find a show, save it for later, and listen without creating an account.":
    "Finde eine Sendung, speichere sie und höre sie ohne Benutzerkonto.",
  "Download episode": "Folge herunterladen",
  "Your library is empty. Add a show from Explore to get started.":
    "Deine Bibliothek ist leer. Füge unter Entdecken eine Sendung hinzu.",
  "Episodes you start will appear here so you can pick up where you left off.":
    "Angefangene Folgen erscheinen hier, damit du später weiterhören kannst.",
  episodes: "Folgen",
  Explicit: "Explizit",
  Explore: "Entdecken",
  h: "Std.",
  "In progress": "In Bearbeitung",
  "Latest episodes": "Neueste Folgen",
  "Last updated": "Zuletzt aktualisiert",
  "Your library": "Deine Bibliothek",
  "Now playing": "Aktuelle Wiedergabe",
  "Episodes are unavailable right now. Please try another show.":
    "Die Folgen sind derzeit nicht verfügbar. Probiere eine andere Sendung.",
  "Loading the latest episodes…": "Neueste Folgen werden geladen…",
  "Local library": "Lokale Bibliothek",
  "Your library stays on this device.": "Deine Bibliothek bleibt auf diesem Gerät.",
  m: "Min.",
  "No podcasts found. Try a show, host, or topic.":
    "Keine Podcasts gefunden. Suche nach einer Sendung, Person oder einem Thema.",
  Pause: "Pause",
  "Playback position": "Wiedergabeposition",
  "Open picture in picture": "Bild-in-Bild öffnen",
  Play: "Abspielen",
  "View on Apple Podcasts": "In Apple Podcasts ansehen",
  "Popular right now": "Gerade beliebt",
  "Podcast discovery data is provided by Apple. Audio is streamed directly from each podcast publisher. Downloads depend on the publisher and your browser.":
    "Die Daten zur Podcast-Entdeckung stammen von Apple. Audio wird direkt von den jeweiligen Herausgebern gestreamt. Downloads hängen vom Herausgeber und deinem Browser ab.",
  Remove: "Entfernen",
  "Remove from in progress": "Aus In Bearbeitung entfernen",
  "Your saved listening position for this episode will be deleted.":
    "Die gespeicherte Hörposition für diese Folge wird gelöscht.",
  "Remove saved progress?": "Gespeicherten Fortschritt entfernen?",
  Resume: "Fortsetzen",
  Search: "Suchen",
  "Search is unavailable right now. Please try again.":
    "Die Suche ist derzeit nicht verfügbar. Versuche es erneut.",
  "Search shows, people, or topics": "Sendungen, Personen oder Themen suchen",
  "Search results": "Suchergebnisse",
  "Searching podcasts": "Podcasts werden gesucht",
  "Show episodes": "Folgen anzeigen",
  Podcasts: "Podcasts",
} satisfies TranslationCatalog<typeof englishMessages>;
