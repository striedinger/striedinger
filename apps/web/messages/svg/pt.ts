import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "SVG Editor": "Editor de SVG",
  "SVG Viewer, Editor, and Optimizer": "Visualizador, editor e otimizador de SVG",
  "Edit SVG code with a live preview, then optimize it or export it as a PNG. Everything stays in your browser.":
    "Edite código SVG com pré-visualização ao vivo e depois otimize-o ou exporte-o como PNG. Tudo permanece no seu navegador.",
  "SVG code": "Código SVG",
  "Paste SVG code here": "Cole o código SVG aqui",
  Preview: "Pré-visualização",
  "Valid SVG": "SVG válido",
  "Invalid SVG: {error}": "SVG inválido: {error}",
  "This document is not an SVG image.": "Este documento não é uma imagem SVG.",
  "This SVG is too large to edit safely in the browser.":
    "Este SVG é grande demais para ser editado com segurança no navegador.",
  "Enter valid SVG code to see a preview.":
    "Insira um código SVG válido para ver uma pré-visualização.",
  "Your SVG stays in this browser and is never sent to the server.":
    "Seu SVG permanece neste navegador e nunca é enviado ao servidor.",
  Background: "Fundo",
  Grid: "Grade",
  Light: "Claro",
  Dark: "Escuro",
  Open: "Abrir",
  Optimize: "Otimizar",
  Copy: "Copiar",
  Copied: "Copiado",
  "Download SVG": "Baixar SVG",
  "Export PNG": "Exportar PNG",
  "Optimized from {before} to {after}.": "Otimizado de {before} para {after}.",
  "This SVG is already optimized.": "Este SVG já está otimizado.",
  "This SVG could not be optimized.": "Não foi possível otimizar este SVG.",
  "This file could not be opened as an SVG.": "Não foi possível abrir este arquivo como SVG.",
  "This SVG could not be exported as a PNG.": "Não foi possível exportar este SVG como PNG.",
  Dimensions: "Dimensões",
  "File size": "Tamanho do arquivo",
  Elements: "Elementos",
  "SVG actions": "Ações de SVG",
});
