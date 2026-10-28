import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "What Hugo is listening to": "O que Hugo está ouvindo",
  "See what Hugo Striedinger is playing on Spotify right now.":
    "Veja o que Hugo Striedinger está ouvindo no Spotify agora.",
  "Press play to see what Hugo is listening to on Spotify":
    "Toque em reproduzir para ver o que Hugo está ouvindo no Spotify",
  "What’s Hugo listening to right now?": "O que Hugo está ouvindo agora?",
  "Press play to see": "Toque em reproduzir para ver",
  "Listening now": "Ouvindo agora",
  Paused: "Pausado",
  "Last played {time}": "Última reprodução {time}",
  "Recently played": "Tocado recentemente",
  "Not listening right now": "Não está ouvindo nada agora",
  "Nothing playing": "Nada tocando",
  "Check back in a bit": "Volte daqui a pouco",
  "Open in Spotify": "Abrir no Spotify",
  "Open Spotify": "Abrir o Spotify",
  "Playback position": "Posição da reprodução",
  "{elapsed} of {total}": "{elapsed} de {total}",
  "{album} cover": "Capa de {album}",
};
