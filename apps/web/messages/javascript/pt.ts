import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "JavaScript Browser Information": "Informações JavaScript do navegador",
  "Inspect the JavaScript, screen, navigator, media, network, and storage information exposed by your browser.":
    "Inspecione as informações de JavaScript, tela, navegador, mídia, rede e armazenamento expostas pelo seu navegador.",
  "Everything shown here is read locally in your browser and is not uploaded or stored.":
    "Tudo o que aparece aqui é lido localmente no navegador e não é enviado nem armazenado.",
  "Values are collected after the page loads and may change when browser permissions, windows, displays, or network conditions change.":
    "Os valores são coletados após o carregamento e podem mudar com permissões, janelas, telas ou condições de rede.",
  "JavaScript is disabled, so browser details cannot be collected.":
    "O JavaScript está desativado, portanto os detalhes do navegador não podem ser coletados.",
  "Collecting browser details…": "Coletando detalhes do navegador…",
  "Refresh details": "Atualizar detalhes",
  Unavailable: "Indisponível",
  Supported: "Compatível",
  "Not supported": "Não compatível",
  Enabled: "Ativado",
  "JavaScript and Document": "JavaScript e documento",
  "Screen and Window": "Tela e janela",
  "Date, Time, and Internationalization": "Data, hora e internacionalização",
  Navigator: "Navegador",
  "User-Agent Client Hints": "Dicas do cliente do agente do usuário",
  "Plugins and MIME Types": "Plugins e tipos MIME",
  "Battery and Network": "Bateria e rede",
  "Media and Device APIs": "APIs de mídia e dispositivo",
  "Storage APIs": "APIs de armazenamento",
  "Additional Navigator Properties": "Propriedades adicionais do navegador",
};
