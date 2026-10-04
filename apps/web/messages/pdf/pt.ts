import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "PDF Optimizer": "Otimizador de PDF",
  "PDF Compressor and Optimizer": "Compressor e otimizador de PDF",
  "Compress, preview, and remove PDF restrictions entirely in your browser.":
    "Comprima, visualize e remova restrições de PDFs inteiramente no seu navegador.",
  Balanced: "Equilibrado",
  "Choose PDF": "Escolher PDF",
  "Compress PDF": "Comprimir PDF",
  "Compression mode": "Modo de compressão",
  Download: "Baixar",
  "Drop PDF to start": "Solte o PDF para começar",
  "Drop a PDF here": "Solte um PDF aqui",
  "This PDF is locked. Enter its password to preview it.":
    "Este PDF está bloqueado. Digite a senha para visualizá-lo.",
  "Your PDF stays on this device.": "Seu PDF fica neste dispositivo.",
  "That password did not open this PDF.": "Essa senha não abriu este PDF.",
  "Rendering preview": "Gerando visualização",
  "Lossless rewrite": "Regravação sem perdas",
  "The original was already smaller": "O original já era menor",
  "Open PDF": "Abrir PDF",
  pages: "páginas",
  "PDF password": "Senha do PDF",
  "Enter a password you are authorized to use. It is never stored.":
    "Digite uma senha que você tem autorização para usar. Ela nunca é armazenada.",
  Preview: "Visualização",
  "Preparing PDF": "Preparando PDF",
  Quality: "Qualidade",
  "Remove restrictions": "Remover restrições",
  "Choose another": "Escolher outro",
  "Optimized PDF": "PDF otimizado",
  smaller: "menor",
  "Smallest file": "Menor arquivo",
  "One PDF at a time · processed locally": "Um PDF por vez · processado localmente",
  "Restrictions removed": "Restrições removidas",
  "This PDF could not be opened in your browser.":
    "Não foi possível abrir este PDF no seu navegador.",
};
