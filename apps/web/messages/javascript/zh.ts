import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "JavaScript Browser Information": "浏览器 JavaScript 信息",
  "Inspect the JavaScript, screen, navigator, media, network, and storage information exposed by your browser.":
    "检查浏览器公开的 JavaScript、屏幕、导航器、媒体、网络和存储信息。",
  "Everything shown here is read locally in your browser and is not uploaded or stored.":
    "此处显示的所有内容均在浏览器本地读取，不会上传或存储。",
  "Values are collected after the page loads and may change when browser permissions, windows, displays, or network conditions change.":
    "页面加载后会收集这些值；浏览器权限、窗口、显示器或网络状况变化时，这些值也可能变化。",
  "JavaScript is disabled, so browser details cannot be collected.":
    "JavaScript 已禁用，因此无法收集浏览器详细信息。",
  "Collecting browser details…": "正在收集浏览器详细信息…",
  "Refresh details": "刷新详细信息",
  Unavailable: "不可用",
  Supported: "支持",
  "Not supported": "不支持",
  Enabled: "已启用",
  "JavaScript and Document": "JavaScript 与文档",
  "Screen and Window": "屏幕与窗口",
  "Date, Time, and Internationalization": "日期、时间与国际化",
  Navigator: "导航器",
  "User-Agent Client Hints": "用户代理客户端提示",
  "Plugins and MIME Types": "插件与 MIME 类型",
  "Battery and Network": "电池与网络",
  "Media and Device APIs": "媒体与设备 API",
  "Storage APIs": "存储 API",
  "Additional Navigator Properties": "其他导航器属性",
};
