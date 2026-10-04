import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Image Optimizer": "图像优化器",
  "Image Compressor and Optimizer": "图像压缩与优化工具",
  "Compress images privately in your browser. Nothing is uploaded.":
    "在浏览器中私密压缩图像，不会上传任何文件。",
  "Add more": "添加更多",
  Auto: "自动",
  "Auto size target": "自动大小目标",
  Balanced: "均衡",
  Optimizing: "正在优化",
  "Choose files": "选择文件",
  "Clear all": "全部清除",
  Download: "下载",
  "Download all": "全部下载",
  "Drop files to start": "松开以开始",
  "Drop images here": "将图像拖放到这里",
  "Could not optimize": "无法优化",
  "Image format": "图像格式",
  "Maximum dimension": "最大尺寸",
  Original: "原始",
  "Resize the longest side, in pixels.": "调整最长边的像素尺寸。",
  "Preparing file": "正在准备文件",
  "Decoding image": "正在解码图像",
  "Trying smaller formats": "正在尝试更小的格式",
  "Checking visual quality": "正在检查视觉质量",
  "Compression mode": "压缩模式",
  "Files stay on this device. Processing happens entirely in your browser.":
    "文件保留在此设备上，所有处理均在浏览器中完成。",
  Quality: "质量",
  "Lower values create smaller files.": "数值越低，文件越小。",
  Lossless: "无损",
  Files: "文件",
  Remove: "移除",
  smaller: "更小",
  "No smaller result at this quality": "在此质量下没有更小的结果",
  "Smallest file": "最小文件",
  "HEIC, HEIF, JPEG, PNG, WebP, AVIF, GIF, SVG, and BMP · up to 20 files":
    "HEIC、HEIF、JPEG、PNG、WebP、AVIF、GIF、SVG 和 BMP · 最多 20 个文件",
  "You can optimize up to 20 files at once.": "一次最多可优化 20 个文件。",
  "One or more files use a format this browser cannot process.":
    "有文件使用了此浏览器无法处理的格式。",
};
