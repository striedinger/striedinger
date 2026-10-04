import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "PDF Optimizer": "Optimizador de PDF",
  "PDF Compressor and Optimizer": "Compresor y optimizador de PDF",
  "Compress, preview, and remove PDF restrictions entirely in your browser.":
    "Comprime, previsualiza y quita restricciones de PDF por completo en tu navegador.",
  Balanced: "Equilibrado",
  "Choose PDF": "Elegir PDF",
  "Compress PDF": "Comprimir PDF",
  "Compression mode": "Modo de compresión",
  Download: "Descargar",
  "Drop PDF to start": "Suelta el PDF para empezar",
  "Drop a PDF here": "Suelta un PDF aquí",
  "This PDF is locked. Enter its password to preview it.":
    "Este PDF está bloqueado. Introduce su contraseña para previsualizarlo.",
  "Your PDF stays on this device.": "Tu PDF se queda en este dispositivo.",
  "That password did not open this PDF.": "Esa contraseña no abrió este PDF.",
  "Rendering preview": "Generando vista previa",
  "Lossless rewrite": "Reescritura sin pérdida",
  "The original was already smaller": "El original ya era más pequeño",
  "Open PDF": "Abrir PDF",
  pages: "páginas",
  "PDF password": "Contraseña del PDF",
  "Enter a password you are authorized to use. It is never stored.":
    "Introduce una contraseña que estés autorizado a usar. Nunca se guarda.",
  Preview: "Vista previa",
  "Preparing PDF": "Preparando PDF",
  Quality: "Calidad",
  "Remove restrictions": "Quitar restricciones",
  "Choose another": "Elegir otro",
  "Optimized PDF": "PDF optimizado",
  smaller: "más pequeño",
  "Smallest file": "Archivo más pequeño",
  "One PDF at a time · processed locally": "Un PDF a la vez · procesado localmente",
  "Restrictions removed": "Restricciones eliminadas",
  "This PDF could not be opened in your browser.": "Este PDF no se pudo abrir en tu navegador.",
};
