import type { TranslationCatalog } from "@workspace/i18n";
import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "Open Graph Preview": "Prévia do Open Graph",
  "Enter any public URL to inspect its Open Graph and X metadata, preview its social cards, and review the tags found in the page.":
    "Digite uma URL pública para inspecionar os metadados Open Graph e X, visualizar os cartões sociais e revisar as tags encontradas.",
  "URL to preview": "URL para visualizar",
  "https://example.com": "https://exemplo.com",
  "Preview cards": "Visualizar cartões",
  "Previewing {url} ({duration} ms)": "Pré-visualizando {url} ({duration} ms)",
  "Checking…": "Verificando…",
  "Only public HTTP(S) pages on standard ports are fetched. Private networks, local addresses, credentials, oversized responses, and unsafe redirects are blocked.":
    "Somente páginas HTTP(S) públicas em portas padrão são acessadas. Redes privadas, endereços locais, credenciais, respostas grandes e redirecionamentos inseguros são bloqueados.",
  "Social card previews": "Prévias de cartões sociais",
  "Open Graph preview": "Prévia do Open Graph",
  "X / Twitter card preview": "Prévia do cartão X / Twitter",
  "From": "De",
  "Detected metadata": "Metadados detectados",
  "All usable meta tags, document title, and canonical URL found in the page head.":
    "Todas as meta tags utilizáveis, o título do documento e a URL canônica encontrados no cabeçalho da página.",
  "Enter a valid absolute URL, including http:// or https://.":
    "Digite uma URL absoluta válida, incluindo http:// ou https://.",
  "That address is not allowed. Private, local, and non-standard network targets are blocked.":
    "Esse endereço não é permitido. Destinos privados, locais e não padronizados são bloqueados.",
  "That page could not be reached within the allowed time.":
    "A página não pôde ser acessada dentro do tempo permitido.",
  "The response was not an HTML page.": "A resposta não era uma página HTML.",
  "The HTML response was too large to inspect safely.":
    "A resposta HTML era grande demais para ser inspecionada com segurança.",
  "No usable social metadata was found on that page.":
    "Nenhum metadado social utilizável foi encontrado nessa página.",
  "Too many previews were requested. Please wait a minute and try again.":
    "Muitas prévias foram solicitadas. Aguarde um minuto e tente novamente.",
  "Preview Open Graph and X cards for any public URL. Inspect titles, descriptions, images, and raw social metadata with a fast, secure online tester.":
    "Visualize cartões Open Graph e X para qualquer URL pública. Inspecione títulos, descrições, imagens e metadados sociais com rapidez e segurança.",
  "Test Open Graph and X metadata": "Teste metadados Open Graph e X",
  "Check how a public page may appear when shared, including its title, description, preview image, site name, card type, and detected social tags.":
    "Confira como uma página pública pode aparecer ao ser compartilhada, incluindo título, descrição, imagem, site, tipo de cartão e tags sociais.",
};
