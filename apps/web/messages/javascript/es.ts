import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "JavaScript Browser Information": "Información JavaScript del navegador",
  "Inspect the JavaScript, screen, navigator, media, network, and storage information exposed by your browser.":
    "Inspecciona la información de JavaScript, pantalla, navegador, multimedia, red y almacenamiento que expone tu navegador.",
  "Everything shown here is read locally in your browser and is not uploaded or stored.":
    "Todo lo que se muestra aquí se lee localmente en tu navegador y no se sube ni se almacena.",
  "Values are collected after the page loads and may change when browser permissions, windows, displays, or network conditions change.":
    "Los valores se recopilan después de cargar la página y pueden cambiar con los permisos, ventanas, pantallas o condiciones de red.",
  "JavaScript is disabled, so browser details cannot be collected.":
    "JavaScript está desactivado, por lo que no se pueden recopilar los detalles del navegador.",
  "Collecting browser details…": "Recopilando detalles del navegador…",
  "Refresh details": "Actualizar detalles",
  Unavailable: "No disponible",
  Supported: "Compatible",
  "Not supported": "No compatible",
  Enabled: "Activado",
  "JavaScript and Document": "JavaScript y documento",
  "Screen and Window": "Pantalla y ventana",
  "Date, Time, and Internationalization": "Fecha, hora e internacionalización",
  Navigator: "Navegador",
  "User-Agent Client Hints": "Indicaciones de cliente del agente de usuario",
  "Plugins and MIME Types": "Complementos y tipos MIME",
  "Battery and Network": "Batería y red",
  "Media and Device APIs": "API multimedia y del dispositivo",
  "Storage APIs": "API de almacenamiento",
  "Additional Navigator Properties": "Propiedades adicionales del navegador",
};
