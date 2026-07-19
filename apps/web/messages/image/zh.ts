import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Image Optimizer": "图像优化器",
  "Compress images privately in your browser. Nothing is uploaded.":
    "在浏览器中私密压缩图像，不会上传任何文件。",
};
