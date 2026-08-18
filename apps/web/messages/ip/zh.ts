import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "IP Address Information": "IP 地址信息",
  "See the public IP address, approximate request location, and HTTP information visible to this website.":
    "查看此网站可见的公网 IP 地址、大致请求位置和 HTTP 信息。",
  "The server reports the address and request metadata it receives from your connection.":
    "服务器显示它从你的连接中收到的地址和请求元数据。",
  "This page does not use a third-party IP lookup service. Approximate location is shown only when the hosting platform provides it.":
    "此页面不使用第三方 IP 查询服务。仅当托管平台提供时才会显示大致位置。",
  "Loading request details…": "正在加载请求详细信息…",
  "Observed IP Address": "观察到的 IP 地址",
  "IP address": "IP 地址",
  "IP version": "IP 版本",
  "Request Location": "请求位置",
  "Location values are approximate and may identify a network exit point instead of your physical location.":
    "位置值为估算结果，可能代表网络出口，而不是你的实际位置。",
  Country: "国家或地区",
  Region: "区域",
  City: "城市",
  "Time zone": "时区",
  Latitude: "纬度",
  Longitude: "经度",
  "Request Details": "请求详细信息",
  Protocol: "协议",
  Host: "主机",
  "Forwarded addresses": "转发地址",
  "HTTP Request Headers": "HTTP 请求标头",
  "Only privacy-safe request headers are displayed. Cookies, authorization values, and internal identifiers are excluded.":
    "仅显示不会泄露隐私的请求标头；Cookie、授权值和内部标识符均被排除。",
  "WebRTC Leak Test": "WebRTC 泄漏测试",
  "This optional test contacts Cloudflare's public STUN server and lists the ICE addresses exposed by your browser.":
    "此可选测试会连接 Cloudflare 的公共 STUN 服务器，并列出浏览器公开的 ICE 地址。",
  "Run WebRTC test": "运行 WebRTC 测试",
  "Testing…": "正在测试…",
  "Candidate type": "候选类型",
  Address: "地址",
  "No ICE candidates were exposed.": "未公开任何 ICE 候选项。",
  "WebRTC is not supported by this browser.": "此浏览器不支持 WebRTC。",
  "The WebRTC test could not complete.": "WebRTC 测试无法完成。",
  Unavailable: "不可用",
};
