import type { TranslationCatalog } from "@workspace/i18n";
import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "Open Graph Preview": "Open Graph 预览",
  "Enter any public URL to inspect its Open Graph and X metadata, preview its social cards, and review the tags found in the page.":
    "输入任意公开网址，检查其 Open Graph 和 X 元数据、预览社交卡片并查看页面中的标签。",
  "URL to preview": "要预览的网址",
  "https://example.com": "https://example.com",
  "Preview cards": "预览卡片",
  "Previewing {url} ({duration} ms)": "正在预览 {url}（{duration} 毫秒）",
  "Checking…": "正在检查…",
  "Only public HTTP(S) pages on standard ports are fetched. Private networks, local addresses, credentials, oversized responses, and unsafe redirects are blocked.":
    "仅获取使用标准端口的公开 HTTP(S) 页面。私有网络、本地地址、凭据、过大响应和不安全重定向均会被阻止。",
  "Social card previews": "社交卡片预览",
  "Open Graph preview": "Open Graph 预览",
  "X / Twitter card preview": "X / Twitter 卡片预览",
  "From": "来自",
  "Detected metadata": "检测到的元数据",
  "All usable meta tags, document title, and canonical URL found in the page head.":
    "页面头部中所有可用的元标签、文档标题和规范网址。",
  "Enter a valid absolute URL, including http:// or https://.":
    "请输入包含 http:// 或 https:// 的有效绝对网址。",
  "That address is not allowed. Private, local, and non-standard network targets are blocked.":
    "不允许访问该地址。私有、本地和非标准网络目标会被阻止。",
  "That page could not be reached within the allowed time.": "无法在规定时间内访问该页面。",
  "The response was not an HTML page.": "响应不是 HTML 页面。",
  "The HTML response was too large to inspect safely.": "HTML 响应过大，无法安全检查。",
  "No usable social metadata was found on that page.": "该页面没有可用的社交元数据。",
  "Too many previews were requested. Please wait a minute and try again.":
    "请求的预览次数过多。请等待一分钟后重试。",
  "Preview Open Graph and X cards for any public URL. Inspect titles, descriptions, images, and raw social metadata with a fast, secure online tester.":
    "预览任意公开网址的 Open Graph 和 X 卡片，快速、安全地检查标题、描述、图片和原始社交元数据。",
  "Test Open Graph and X metadata": "测试 Open Graph 和 X 元数据",
  "Check how a public page may appear when shared, including its title, description, preview image, site name, card type, and detected social tags.":
    "检查公开页面分享时的显示效果，包括标题、描述、预览图片、站点名称、卡片类型和检测到的社交标签。",
};
