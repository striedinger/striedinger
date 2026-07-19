import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Add files": "Añadir archivos",
  "Files in this session": "Archivos de esta sesión",
  "Link copied": "Enlace copiado",
  "Could not copy the link. Copy the room code instead.":
    "No se pudo copiar el enlace. Copia el código de la sala.",
  "Copy invite link": "Copiar enlace de invitación",
  "Sent directly": "Enviado directamente",
  Download: "Descargar",
  "Drop to share": "Suelta para compartir",
  "Drop files here": "Suelta archivos aquí",
  "End-to-end encrypted": "Cifrado de extremo a extremo",
  "1 file": "1 archivo",
  "Received file failed its integrity check": "El archivo recibido no superó la verificación",
  "Larger than the 100 MB browser limit": "Supera el límite de 100 MB del navegador",
  "{count} files": "{count} archivos",
  Join: "Unirse",
  "Have a room code?": "¿Tienes un código de sala?",
  "Enter the complete 16-character room code.":
    "Introduce el código de sala completo de 16 caracteres.",
  "Files you select or receive will appear here.":
    "Los archivos que selecciones o recibas aparecerán aquí.",
  "Waiting for another device": "Esperando otro dispositivo",
  "1 device connected": "1 dispositivo conectado",
  "{count} devices connected": "{count} dispositivos conectados",
  "Preparing…": "Preparando…",
  "Files stay in your browser until a device connects. Up to 100 MB each.":
    "Los archivos permanecen en tu navegador hasta que se conecta un dispositivo. Máximo 100 MB cada uno.",
  "Your room": "Tu sala",
  "A direct connection could not be established. Try another network or browser.":
    "No se pudo establecer una conexión directa. Prueba otra red o navegador.",
  Retry: "Reintentar",
  "Select files": "Seleccionar archivos",
  Sending: "Enviando",
  "Share invite": "Compartir invitación",
  "Send the private link or room code to another device.":
    "Envía el enlace privado o el código de sala a otro dispositivo.",
  "Transfer failed": "La transferencia falló",
  "Ready to send": "Listo para enviar",
};
