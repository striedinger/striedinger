import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "What Hugo is listening to": "Cosa sta ascoltando Hugo",
  "See what Hugo Striedinger is playing on Spotify right now.":
    "Scopri cosa sta ascoltando Hugo Striedinger su Spotify in questo momento.",
  "Press play to see what Hugo is listening to on Spotify":
    "Premi play per vedere cosa ascolta Hugo su Spotify",
  "What’s Hugo listening to right now?": "Cosa sta ascoltando Hugo adesso?",
  "Press play to see": "Premi play per scoprirlo",
  "Listening now": "In ascolto ora",
  Paused: "In pausa",
  "Last played {time}": "Ultimo ascolto {time}",
  "Recently played": "Ascoltato di recente",
  "Not listening right now": "Non sta ascoltando niente",
  "Nothing playing": "Nessuna riproduzione",
  "Check back in a bit": "Torna tra un po’",
  "Open in Spotify": "Apri in Spotify",
  "Open Spotify": "Apri Spotify",
  "Playback position": "Posizione di riproduzione",
  "{elapsed} of {total}": "{elapsed} di {total}",
  "{album} cover": "Copertina di {album}",
};
