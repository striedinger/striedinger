import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages = {
  Add: "Añadir",
  Added: "Añadido",
  "Back to shows": "Volver a los programas",
  Cancel: "Cancelar",
  "Close player": "Cerrar reproductor",
  "Cover art": "Portada",
  "Find a show, save it for later, and listen without creating an account.":
    "Encuentra un programa, guárdalo para después y escúchalo sin crear una cuenta.",
  "Download episode": "Descargar episodio",
  "Your library is empty. Add a show from Explore to get started.":
    "Tu biblioteca está vacía. Añade un programa desde Explorar para empezar.",
  "Episodes you start will appear here so you can pick up where you left off.":
    "Los episodios que empieces aparecerán aquí para que puedas retomarlos.",
  episodes: "episodios",
  Explicit: "Explícito",
  Explore: "Explorar",
  h: "h",
  "In progress": "En curso",
  "Latest episodes": "Últimos episodios",
  "Last updated": "Última actualización",
  "Your library": "Tu biblioteca",
  "Now playing": "Reproduciendo",
  "Episodes are unavailable right now. Please try another show.":
    "Los episodios no están disponibles ahora. Prueba con otro programa.",
  "Loading the latest episodes…": "Cargando los últimos episodios…",
  "Local library": "Biblioteca local",
  "Your library stays on this device.": "Tu biblioteca permanece en este dispositivo.",
  m: "min",
  "No podcasts found. Try a show, host, or topic.":
    "No se encontraron podcasts. Prueba con un programa, persona o tema.",
  Pause: "Pausar",
  "Playback position": "Posición de reproducción",
  "Open picture in picture": "Abrir imagen en imagen",
  Play: "Reproducir",
  "View on Apple Podcasts": "Ver en Apple Podcasts",
  "Popular right now": "Popular ahora",
  "Podcast discovery data is provided by Apple. Audio is streamed directly from each podcast publisher. Downloads depend on the publisher and your browser.":
    "Apple proporciona los datos para descubrir podcasts. El audio se transmite directamente desde cada editor. Las descargas dependen del editor y de tu navegador.",
  Remove: "Eliminar",
  "Remove from in progress": "Quitar de En curso",
  "Your saved listening position for this episode will be deleted.":
    "Se eliminará la posición de escucha guardada para este episodio.",
  "Remove saved progress?": "¿Eliminar el progreso guardado?",
  Resume: "Reanudar",
  Search: "Buscar",
  "Search is unavailable right now. Please try again.":
    "La búsqueda no está disponible ahora. Inténtalo de nuevo.",
  "Search shows, people, or topics": "Buscar programas, personas o temas",
  "Search results": "Resultados de búsqueda",
  "Searching podcasts": "Buscando podcasts",
  "Show episodes": "Ver episodios",
  Podcasts: "Podcasts",
} satisfies TranslationCatalog<typeof englishMessages>;
