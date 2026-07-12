import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages = {
  "Daily Sudoku": "每日数独",
  "Play a fresh daily Sudoku puzzle with easy, medium, and hard levels. Track your time and share your result as an image.":
    "每天挑战新的简单、中等或困难数独，记录用时并将结果分享为图片。",
  "Choose a level": "选择难度",
  Easy: "简单",
  Medium: "中等",
  Hard: "困难",
  Date: "日期",
  Time: "用时",
  "Sudoku puzzle": "数独题目",
  "Number pad": "数字键盘",
  Erase: "清除",
  "Ready for today's puzzle?": "准备好挑战今天的数独了吗？",
  "Start puzzle": "开始",
  "Restart puzzle": "重新开始数独",
  "Restart this puzzle?": "重新开始这道数独？",
  "Your current progress and time will be cleared.": "当前进度和用时将被清除。",
  Cancel: "取消",
  Restart: "重新开始",
  Score: "得分",
  "Inputs: {count} · minimum: {minimum}": "输入：{count} 次 · 最少：{minimum} 次",
  "Row {row}, column {column}, empty": "第 {row} 行，第 {column} 列，空白",
  "Row {row}, column {column}, {value}": "第 {row} 行，第 {column} 列，{value}",
  "Puzzle complete!": "数独完成！",
  "Share result": "分享结果",
  "Creating image": "正在生成图片",
  "Result shared.": "结果已分享。",
  "Sharing is unavailable, so the result image was downloaded instead.":
    "当前无法分享，结果图片已改为下载。",
  "The result image could not be created. Please try again.": "无法生成结果图片，请重试。",
} satisfies TranslationCatalog<typeof englishMessages>;
