import type { TranslationCatalog } from "@workspace/i18n";
import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "Open Graph Preview": "Vista previa de Open Graph",
  "Enter any public URL to inspect its Open Graph and X metadata, preview its social cards, and review the tags found in the page.":
    "Introduce una URL pública para inspeccionar sus metadatos de Open Graph y X, previsualizar sus tarjetas sociales y revisar las etiquetas encontradas.",
  "URL to preview": "URL para previsualizar",
  "https://example.com": "https://ejemplo.com",
  "Preview cards": "Previsualizar tarjetas",
  "Previewing {url} ({duration} ms)": "Vista previa de {url} ({duration} ms)",
  "Checking…": "Comprobando…",
  "Only public HTTP(S) pages on standard ports are fetched. Private networks, local addresses, credentials, oversized responses, and unsafe redirects are blocked.":
    "Solo se consultan páginas HTTP(S) públicas en puertos estándar. Se bloquean redes privadas, direcciones locales, credenciales, respuestas demasiado grandes y redirecciones inseguras.",
  "Social card previews": "Vistas previas de tarjetas sociales",
  "Open Graph preview": "Vista previa de Open Graph",
  "X / Twitter card preview": "Vista previa de tarjeta X / Twitter",
  "From": "De",
  "Detected metadata": "Metadatos detectados",
  "All usable meta tags, document title, and canonical URL found in the page head.":
    "Todas las etiquetas meta utilizables, el título del documento y la URL canónica encontrados en la cabecera de la página.",
  "Enter a valid absolute URL, including http:// or https://.":
    "Introduce una URL absoluta válida que incluya http:// o https://.",
  "That address is not allowed. Private, local, and non-standard network targets are blocked.":
    "Esa dirección no está permitida. Se bloquean destinos privados, locales y puertos no estándar.",
  "That page could not be reached within the allowed time.":
    "No se pudo acceder a la página dentro del tiempo permitido.",
  "The response was not an HTML page.": "La respuesta no era una página HTML.",
  "The HTML response was too large to inspect safely.":
    "La respuesta HTML era demasiado grande para inspeccionarla de forma segura.",
  "No usable social metadata was found on that page.":
    "No se encontraron metadatos sociales utilizables en esa página.",
  "Too many previews were requested. Please wait a minute and try again.":
    "Se solicitaron demasiadas vistas previas. Espera un minuto e inténtalo de nuevo.",
  "Preview Open Graph and X cards for any public URL. Inspect titles, descriptions, images, and raw social metadata with a fast, secure online tester.":
    "Previsualiza tarjetas de Open Graph y X para cualquier URL pública. Inspecciona títulos, descripciones, imágenes y metadatos sociales con una herramienta rápida y segura.",
  "Test Open Graph and X metadata": "Prueba metadatos de Open Graph y X",
  "Check how a public page may appear when shared, including its title, description, preview image, site name, card type, and detected social tags.":
    "Comprueba cómo puede aparecer una página pública al compartirla, incluidos el título, la descripción, la imagen, el sitio, el tipo de tarjeta y las etiquetas sociales.",
};
