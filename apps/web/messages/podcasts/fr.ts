import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages = {
  Add: "Ajouter",
  Added: "Ajouté",
  "Back to shows": "Retour aux émissions",
  Cancel: "Annuler",
  "Close player": "Fermer le lecteur",
  "Cover art": "Pochette",
  "Find a show, save it for later, and listen without creating an account.":
    "Trouvez une émission, enregistrez-la et écoutez-la sans créer de compte.",
  "Download episode": "Télécharger l’épisode",
  "Your library is empty. Add a show from Explore to get started.":
    "Votre bibliothèque est vide. Ajoutez une émission depuis Explorer.",
  "Episodes you start will appear here so you can pick up where you left off.":
    "Les épisodes commencés apparaîtront ici afin de reprendre votre écoute.",
  episodes: "épisodes",
  Explicit: "Explicite",
  Explore: "Explorer",
  h: "h",
  "In progress": "En cours",
  "Latest episodes": "Derniers épisodes",
  "Last updated": "Dernière mise à jour",
  "Your library": "Votre bibliothèque",
  "Now playing": "Lecture en cours",
  "Episodes are unavailable right now. Please try another show.":
    "Les épisodes sont indisponibles pour le moment. Essayez une autre émission.",
  "Loading the latest episodes…": "Chargement des derniers épisodes…",
  "Local library": "Bibliothèque locale",
  "Your library stays on this device.": "Votre bibliothèque reste sur cet appareil.",
  m: "min",
  "No podcasts found. Try a show, host, or topic.":
    "Aucun podcast trouvé. Essayez une émission, une personne ou un sujet.",
  Pause: "Pause",
  "Playback position": "Position de lecture",
  "Open picture in picture": "Ouvrir l’image dans l’image",
  Play: "Lire",
  "View on Apple Podcasts": "Voir sur Apple Podcasts",
  "Popular right now": "Populaires en ce moment",
  "Podcast discovery data is provided by Apple. Audio is streamed directly from each podcast publisher. Downloads depend on the publisher and your browser.":
    "Les données de découverte des podcasts sont fournies par Apple. L’audio est diffusé directement par chaque éditeur. Les téléchargements dépendent de l’éditeur et de votre navigateur.",
  Remove: "Supprimer",
  "Remove from in progress": "Retirer de En cours",
  "Your saved listening position for this episode will be deleted.":
    "La position d’écoute enregistrée pour cet épisode sera supprimée.",
  "Remove saved progress?": "Supprimer la progression enregistrée ?",
  Resume: "Reprendre",
  Search: "Rechercher",
  "Search is unavailable right now. Please try again.":
    "La recherche est indisponible pour le moment. Réessayez.",
  "Search shows, people, or topics": "Rechercher des émissions, personnes ou sujets",
  "Search results": "Résultats de recherche",
  "Searching podcasts": "Recherche de podcasts",
  "Show episodes": "Afficher les épisodes",
  Podcasts: "Podcasts",
} satisfies TranslationCatalog<typeof englishMessages>;
