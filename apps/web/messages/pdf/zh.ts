import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "PDF Optimizer": "PDF 优化器",
  "PDF Compressor and Optimizer": "PDF 压缩与优化工具",
  "Compress, preview, and remove PDF restrictions entirely in your browser.":
    "完全在浏览器中压缩、预览 PDF 并移除其限制。",
  Balanced: "均衡",
  "Choose PDF": "选择 PDF",
  "Compress PDF": "压缩 PDF",
  "Compression mode": "压缩模式",
  Download: "下载",
  "Drop PDF to start": "松开以开始",
  "Drop a PDF here": "将 PDF 拖放到这里",
  "This PDF is locked. Enter its password to preview it.": "此 PDF 已加密。输入密码即可预览。",
  "Your PDF stays on this device.": "你的 PDF 保留在此设备上。",
  "That password did not open this PDF.": "该密码无法打开此 PDF。",
  "Rendering preview": "正在生成预览",
  "Lossless rewrite": "无损重写",
  "The original was already smaller": "原文件已经更小",
  "Open PDF": "打开 PDF",
  pages: "页",
  "PDF password": "PDF 密码",
  "Enter a password you are authorized to use. It is never stored.":
    "请输入你有权使用的密码。密码绝不会被保存。",
  Preview: "预览",
  "Preparing PDF": "正在准备 PDF",
  Quality: "质量",
  "Remove restrictions": "移除限制",
  "Choose another": "选择其他文件",
  "Optimized PDF": "已优化的 PDF",
  smaller: "更小",
  "Smallest file": "最小文件",
  "One PDF at a time · processed locally": "一次处理一个 PDF · 本地处理",
  "Restrictions removed": "限制已移除",
  "This PDF could not be opened in your browser.": "无法在浏览器中打开此 PDF。",
};
