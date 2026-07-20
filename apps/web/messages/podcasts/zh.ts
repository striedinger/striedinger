import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages = {
  Add: "添加",
  Added: "已添加",
  "Back to shows": "返回节目列表",
  Cancel: "取消",
  "Close player": "关闭播放器",
  "Cover art": "封面",
  "Find a show, save it for later, and listen without creating an account.":
    "发现节目、保存以便稍后收听，无需创建账户。",
  "Download episode": "下载单集",
  "Your library is empty. Add a show from Explore to get started.":
    "你的资料库为空。请从“探索”中添加节目。",
  "Episodes you start will appear here so you can pick up where you left off.":
    "开始收听的单集会显示在这里，方便你继续播放。",
  episodes: "集",
  Explicit: "成人内容",
  Explore: "探索",
  h: "小时",
  "In progress": "收听中",
  "Latest episodes": "最新单集",
  "Last updated": "最近更新",
  "Your library": "你的资料库",
  "Now playing": "正在播放",
  "Episodes are unavailable right now. Please try another show.":
    "暂时无法获取单集。请尝试其他节目。",
  "Loading the latest episodes…": "正在加载最新单集…",
  "Local library": "本地资料库",
  "Your library stays on this device.": "你的资料库仅保存在此设备上。",
  m: "分钟",
  "No podcasts found. Try a show, host, or topic.": "未找到播客。请尝试搜索节目、人物或主题。",
  Pause: "暂停",
  "Playback position": "播放位置",
  "Open picture in picture": "打开画中画",
  Play: "播放",
  "View on Apple Podcasts": "在 Apple Podcasts 中查看",
  "Popular right now": "当前热门",
  "Podcast discovery data is provided by Apple. Audio is streamed directly from each podcast publisher. Downloads depend on the publisher and your browser.":
    "播客发现数据由 Apple 提供。音频直接由各播客发布者传输。下载功能取决于发布者和你的浏览器。",
  Remove: "移除",
  "Remove from in progress": "从收听中移除",
  "Your saved listening position for this episode will be deleted.":
    "将删除此单集已保存的收听位置。",
  "Remove saved progress?": "移除已保存的进度？",
  Resume: "继续",
  "Clear search": "清除搜索",
  Search: "搜索",
  "Search is unavailable right now. Please try again.": "暂时无法搜索。请稍后重试。",
  "Search shows, people, or topics": "搜索节目、人物或主题",
  "Search results": "搜索结果",
  "Searching podcasts": "正在搜索播客",
  "Show episodes": "查看单集",
  Podcasts: "播客",
} satisfies TranslationCatalog<typeof englishMessages>;
