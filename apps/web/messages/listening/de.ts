import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "What Hugo is listening to": "Was Hugo gerade hört",
  "See what Hugo Striedinger is playing on Spotify right now.":
    "Sieh dir an, was Hugo Striedinger gerade auf Spotify hört.",
  "Press play to see what Hugo is listening to on Spotify":
    "Drück auf Play, um zu sehen, was Hugo auf Spotify hört",
  "What’s Hugo listening to right now?": "Was hört Hugo gerade?",
  "Press play to see": "Drück auf Play",
  "Listening now": "Läuft gerade",
  Paused: "Pausiert",
  "Last played {time}": "Zuletzt gespielt {time}",
  "Recently played": "Kürzlich gespielt",
  "Not listening right now": "Hört gerade nichts",
  "Nothing playing": "Gerade läuft nichts",
  "Check back in a bit": "Schau später wieder vorbei",
  "Open in Spotify": "In Spotify öffnen",
  "Open Spotify": "Spotify öffnen",
  "Playback position": "Wiedergabeposition",
  "{elapsed} of {total}": "{elapsed} von {total}",
  "{album} cover": "Cover von {album}",
  "Hugo’s Spotify": "Hugos Spotify",
  "Press play for what’s on now": "Drück auf Play für das, was gerade läuft",
};
