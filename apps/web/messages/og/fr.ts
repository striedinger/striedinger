import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "Open Graph Preview": "Aperçu Open Graph",
  "Enter any public URL to inspect its Open Graph and X metadata, preview its social cards, and review the tags found in the page.":
    "Saisissez une URL publique pour examiner ses métadonnées Open Graph et X, prévisualiser ses cartes sociales et consulter les balises détectées.",
  "URL to preview": "URL à prévisualiser",
  "https://example.com": "https://exemple.fr",
  "Preview cards": "Prévisualiser",
  "Previewing {url} ({duration} ms)": "Aperçu de {url} ({duration} ms)",
  "Checking…": "Vérification…",
  "Only public HTTP(S) pages on standard ports are fetched. Private networks, local addresses, credentials, oversized responses, and unsafe redirects are blocked.":
    "Seules les pages HTTP(S) publiques sur les ports standard sont récupérées. Les réseaux privés, adresses locales, identifiants, réponses trop volumineuses et redirections dangereuses sont bloqués.",
  "Social card previews": "Aperçus des cartes sociales",
  "Open Graph preview": "Aperçu Open Graph",
  "X / Twitter card preview": "Aperçu de la carte X / Twitter",
  From: "Depuis",
  "Detected metadata": "Métadonnées détectées",
  "All usable meta tags, document title, and canonical URL found in the page head.":
    "Toutes les balises meta utilisables, le titre du document et l’URL canonique trouvés dans l’en-tête de la page.",
  "Enter a valid absolute URL, including http:// or https://.":
    "Saisissez une URL absolue valide incluant http:// ou https://.",
  "That address is not allowed. Private, local, and non-standard network targets are blocked.":
    "Cette adresse n’est pas autorisée. Les cibles privées, locales et non standard sont bloquées.",
  "That page could not be reached within the allowed time.":
    "La page n’a pas pu être atteinte dans le délai autorisé.",
  "The response was not an HTML page.": "La réponse n’était pas une page HTML.",
  "The HTML response was too large to inspect safely.":
    "La réponse HTML était trop volumineuse pour être examinée en toute sécurité.",
  "No usable social metadata was found on that page.":
    "Aucune métadonnée sociale exploitable n’a été trouvée sur cette page.",
  "Too many previews were requested. Please wait a minute and try again.":
    "Trop d’aperçus ont été demandés. Patientez une minute puis réessayez.",
  "Preview Open Graph and X cards for any public URL. Inspect titles, descriptions, images, and raw social metadata with a fast, secure online tester.":
    "Prévisualisez les cartes Open Graph et X de toute URL publique. Examinez titres, descriptions, images et métadonnées sociales rapidement et en toute sécurité.",
  "Test Open Graph and X metadata": "Tester les métadonnées Open Graph et X",
  "Check how a public page may appear when shared, including its title, description, preview image, site name, card type, and detected social tags.":
    "Vérifiez l’apparence d’une page publique lors du partage, notamment son titre, sa description, son image, son site, son type de carte et ses balises sociales.",
};
