import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "IP Address Information": "Informações do endereço IP",
  "See the public IP address, approximate request location, and HTTP information visible to this website.":
    "Veja o endereço IP público, a localização aproximada da solicitação e as informações HTTP visíveis para este site.",
  "The server reports the address and request metadata it receives from your connection.":
    "O servidor mostra o endereço e os metadados da solicitação recebidos da sua conexão.",
  "This page does not use a third-party IP lookup service. Approximate location is shown only when the hosting platform provides it.":
    "Esta página não usa um serviço externo de consulta de IP. A localização aproximada só aparece quando a plataforma de hospedagem a fornece.",
  "Loading request details…": "Carregando detalhes da solicitação…",
  "Observed IP Address": "Endereço IP observado",
  "IP address": "Endereço IP",
  "IP version": "Versão do IP",
  "Request Location": "Localização da solicitação",
  "Location values are approximate and may identify a network exit point instead of your physical location.":
    "Os valores de localização são aproximados e podem identificar um ponto de saída da rede em vez da sua localização física.",
  Country: "País",
  Region: "Região",
  City: "Cidade",
  "Time zone": "Fuso horário",
  Latitude: "Latitude",
  Longitude: "Longitude",
  "Request Details": "Detalhes da solicitação",
  Protocol: "Protocolo",
  Host: "Host",
  "Forwarded addresses": "Endereços encaminhados",
  "HTTP Request Headers": "Cabeçalhos da solicitação HTTP",
  "Only privacy-safe request headers are displayed. Cookies, authorization values, and internal identifiers are excluded.":
    "Apenas cabeçalhos seguros para a privacidade são exibidos. Cookies, autorizações e identificadores internos são excluídos.",
  "WebRTC Leak Test": "Teste de vazamento WebRTC",
  "This optional test contacts Cloudflare's public STUN server and lists the ICE addresses exposed by your browser.":
    "Este teste opcional contata o servidor STUN público da Cloudflare e lista os endereços ICE expostos pelo navegador.",
  "Run WebRTC test": "Executar teste WebRTC",
  "Testing…": "Testando…",
  "Candidate type": "Tipo de candidato",
  Address: "Endereço",
  "No ICE candidates were exposed.": "Nenhum candidato ICE foi exposto.",
  "WebRTC is not supported by this browser.": "Este navegador não oferece suporte a WebRTC.",
  "The WebRTC test could not complete.": "Não foi possível concluir o teste WebRTC.",
  Unavailable: "Indisponível",
};
