import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Image Optimizer": "图像优化器",
  "Image Compressor and Optimizer": "图像压缩与优化工具",
  "Compress images privately in your browser. Nothing is uploaded.":
    "在浏览器中私密压缩图像，不会上传任何文件。",
};
