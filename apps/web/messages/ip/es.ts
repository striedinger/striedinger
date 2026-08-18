import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "IP Address Information": "Información de la dirección IP",
  "See the public IP address, approximate request location, and HTTP information visible to this website.":
    "Consulta la dirección IP pública, la ubicación aproximada de la solicitud y la información HTTP visible para este sitio.",
  "The server reports the address and request metadata it receives from your connection.":
    "El servidor muestra la dirección y los metadatos de solicitud que recibe de tu conexión.",
  "This page does not use a third-party IP lookup service. Approximate location is shown only when the hosting platform provides it.":
    "Esta página no usa un servicio externo de consulta de IP. La ubicación aproximada solo se muestra cuando la plataforma de alojamiento la proporciona.",
  "Loading request details…": "Cargando detalles de la solicitud…",
  "Observed IP Address": "Dirección IP observada",
  "IP address": "Dirección IP",
  "IP version": "Versión de IP",
  "Request Location": "Ubicación de la solicitud",
  "Location values are approximate and may identify a network exit point instead of your physical location.":
    "Los valores de ubicación son aproximados y pueden identificar un punto de salida de red en lugar de tu ubicación física.",
  Country: "País",
  Region: "Región",
  City: "Ciudad",
  "Time zone": "Zona horaria",
  Latitude: "Latitud",
  Longitude: "Longitud",
  "Request Details": "Detalles de la solicitud",
  Protocol: "Protocolo",
  Host: "Host",
  "Forwarded addresses": "Direcciones reenviadas",
  "HTTP Request Headers": "Encabezados de la solicitud HTTP",
  "Only privacy-safe request headers are displayed. Cookies, authorization values, and internal identifiers are excluded.":
    "Solo se muestran encabezados seguros para la privacidad. Se excluyen cookies, valores de autorización e identificadores internos.",
  "WebRTC Leak Test": "Prueba de filtración WebRTC",
  "This optional test contacts Cloudflare's public STUN server and lists the ICE addresses exposed by your browser.":
    "Esta prueba opcional contacta el servidor STUN público de Cloudflare y enumera las direcciones ICE expuestas por tu navegador.",
  "Run WebRTC test": "Ejecutar prueba WebRTC",
  "Testing…": "Probando…",
  "Candidate type": "Tipo de candidato",
  Address: "Dirección",
  "No ICE candidates were exposed.": "No se expusieron candidatos ICE.",
  "WebRTC is not supported by this browser.": "Este navegador no es compatible con WebRTC.",
  "The WebRTC test could not complete.": "La prueba WebRTC no pudo completarse.",
  Unavailable: "No disponible",
};
