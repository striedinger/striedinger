import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "JSON Validator and Formatter": "JSON 验证和格式化工具",
  "Validate, format, and explore JSON entirely in your browser. Your data never leaves this device.":
    "完全在浏览器中验证、格式化和浏览 JSON。您的数据绝不会离开此设备。",
  "JSON input": "JSON 输入",
  "Your JSON stays in this browser and is never sent to the server.":
    "您的 JSON 保留在此浏览器中，绝不会发送到服务器。",
  "Paste JSON here": "在此粘贴 JSON",
  "Valid JSON": "JSON 有效",
  "Invalid JSON: {error}": "JSON 无效：{error}",
  Preview: "预览",
  "Expand all": "全部展开",
  "Collapse all": "全部折叠",
  "Expand value": "展开值",
  "Collapse value": "折叠值",
  "Enter valid JSON to see an expandable preview.": "输入有效的 JSON 以查看可展开的预览。",
  "This JSON is too large to process safely in the browser.":
    "此 JSON 过大，无法在浏览器中安全处理。",
  "This JSON is valid but too complex to preview all at once.":
    "此 JSON 有效，但结构过于复杂，无法一次性完整预览。",
});
