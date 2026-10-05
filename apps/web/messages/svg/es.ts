import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "SVG Editor": "Editor de SVG",
  "SVG Viewer, Editor, and Optimizer": "Visor, editor y optimizador de SVG",
  "Edit SVG code with a live preview, then optimize it or export it as a PNG. Everything stays in your browser.":
    "Edita código SVG con vista previa en vivo y optimízalo o expórtalo como PNG. Todo permanece en tu navegador.",
  "SVG code": "Código SVG",
  "Paste SVG code here": "Pega el código SVG aquí",
  Preview: "Vista previa",
  "Valid SVG": "SVG válido",
  "Invalid SVG: {error}": "SVG no válido: {error}",
  "This document is not an SVG image.": "Este documento no es una imagen SVG.",
  "This SVG is too large to edit safely in the browser.":
    "Este SVG es demasiado grande para editarlo de forma segura en el navegador.",
  "Enter valid SVG code to see a preview.":
    "Introduce código SVG válido para ver una vista previa.",
  "Your SVG stays in this browser and is never sent to the server.":
    "Tu SVG permanece en este navegador y nunca se envía al servidor.",
  Background: "Fondo",
  Grid: "Cuadrícula",
  Light: "Claro",
  Dark: "Oscuro",
  Open: "Abrir",
  Optimize: "Optimizar",
  Copy: "Copiar",
  Copied: "Copiado",
  "Download SVG": "Descargar SVG",
  "Export PNG": "Exportar PNG",
  "Optimized from {before} to {after}.": "Optimizado de {before} a {after}.",
  "This SVG is already optimized.": "Este SVG ya está optimizado.",
  "This SVG could not be optimized.": "No se pudo optimizar este SVG.",
  "This file could not be opened as an SVG.": "No se pudo abrir este archivo como SVG.",
  "This SVG could not be exported as a PNG.": "No se pudo exportar este SVG como PNG.",
  Dimensions: "Dimensiones",
  "File size": "Tamaño del archivo",
  Elements: "Elementos",
  "SVG actions": "Acciones de SVG",
});
