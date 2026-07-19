import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Add files": "添加文件",
  "Files in this session": "此会话中的文件",
  "Link copied": "链接已复制",
  "Could not copy the link. Copy the room code instead.": "无法复制链接，请改为复制房间代码。",
  "Copy invite link": "复制邀请链接",
  "Sent directly": "已直接发送",
  Download: "下载",
  "Drop to share": "松开即可分享",
  "Drop files here": "将文件拖放到这里",
  "End-to-end encrypted": "端到端加密",
  "1 file": "1 个文件",
  "Received file failed its integrity check": "收到的文件未通过完整性检查",
  "Larger than the 100 MB browser limit": "超过浏览器 100 MB 限制",
  "{count} files": "{count} 个文件",
  Join: "加入",
  "Have a room code?": "已有房间代码？",
  "Enter the complete 16-character room code.": "请输入完整的 16 位房间代码。",
  "Files you select or receive will appear here.": "你选择或收到的文件将显示在这里。",
  "Waiting for another device": "正在等待其他设备",
  "1 device connected": "已连接 1 台设备",
  "{count} devices connected": "已连接 {count} 台设备",
  "Preparing…": "准备中…",
  "Files stay in your browser until a device connects. Up to 100 MB each.":
    "文件会保留在浏览器中，直到设备连接。每个文件最大 100 MB。",
  "Your room": "你的房间",
  "A direct connection could not be established. Try another network or browser.":
    "无法建立直接连接。请尝试其他网络或浏览器。",
  Retry: "重试",
  "Select files": "选择文件",
  Sending: "正在发送",
  "Share invite": "分享邀请",
  "Send the private link or room code to another device.": "将私密链接或房间代码发送到另一台设备。",
  "Transfer failed": "传输失败",
  "Ready to send": "可以发送",
};
