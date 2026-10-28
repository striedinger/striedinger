import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "What Hugo is listening to": "Ce que Hugo écoute",
  "See what Hugo Striedinger is playing on Spotify right now.":
    "Découvrez ce que Hugo Striedinger écoute sur Spotify en ce moment.",
  "Press play to see what Hugo is listening to on Spotify":
    "Appuyez sur lecture pour voir ce que Hugo écoute sur Spotify",
  "What’s Hugo listening to right now?": "Qu’est-ce que Hugo écoute en ce moment ?",
  "Press play to see": "Appuyez sur lecture",
  "Listening now": "En écoute",
  Paused: "En pause",
  "Last played {time}": "Dernière écoute {time}",
  "Recently played": "Écouté récemment",
  "Not listening right now": "N’écoute rien en ce moment",
  "Nothing playing": "Aucune lecture",
  "Check back in a bit": "Revenez un peu plus tard",
  "Open in Spotify": "Ouvrir dans Spotify",
  "Open Spotify": "Ouvrir Spotify",
  "Playback position": "Position de lecture",
  "{elapsed} of {total}": "{elapsed} sur {total}",
  "{album} cover": "Pochette de {album}",
  "Hugo’s Spotify": "Le Spotify de Hugo",
  "Press play for what’s on now": "Appuyez sur lecture pour voir ce qui passe",
};
