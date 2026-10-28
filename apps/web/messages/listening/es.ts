import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "What Hugo is listening to": "Lo que Hugo está escuchando",
  "See what Hugo Striedinger is playing on Spotify right now.":
    "Mira qué está escuchando Hugo Striedinger en Spotify ahora mismo.",
  "Press play to see what Hugo is listening to on Spotify":
    "Pulsa reproducir para ver qué escucha Hugo en Spotify",
  "What’s Hugo listening to right now?": "¿Qué está escuchando Hugo ahora mismo?",
  "Press play to see": "Pulsa reproducir para verlo",
  "Listening now": "Escuchando ahora",
  Paused: "En pausa",
  "Last played {time}": "Última reproducción {time}",
  "Recently played": "Reproducido recientemente",
  "Not listening right now": "No está escuchando nada ahora",
  "Nothing playing": "No suena nada",
  "Check back in a bit": "Vuelve en un rato",
  "Open in Spotify": "Abrir en Spotify",
  "Open Spotify": "Abrir Spotify",
  "Playback position": "Posición de reproducción",
  "{elapsed} of {total}": "{elapsed} de {total}",
  "{album} cover": "Portada de {album}",
};
