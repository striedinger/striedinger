import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages = {
  "Daily Sudoku": "デイリー数独",
  "Play a fresh daily Sudoku puzzle with easy, medium, and hard levels. Track your time and share your result as an image.":
    "毎日新しい初級・中級・上級の数独に挑戦し、タイムを計って結果を画像で共有できます。",
  "Choose a level": "難易度を選択",
  Easy: "初級",
  Medium: "中級",
  Hard: "上級",
  Date: "日付",
  Time: "タイム",
  "Sudoku puzzle": "数独パズル",
  "Number pad": "数字キーパッド",
  Erase: "消去",
  "Ready for today's puzzle?": "今日の数独を始めますか？",
  "Start puzzle": "スタート",
  "Restart puzzle": "数独をリスタート",
  "Restart this puzzle?": "この数独をリスタートしますか？",
  "Your current progress and time will be cleared.": "現在の進捗とタイムは消去されます。",
  Cancel: "キャンセル",
  Restart: "リスタート",
  Score: "スコア",
  "Inputs: {count} · minimum: {minimum}": "入力：{count} 回 · 最少：{minimum} 回",
  "Row {row}, column {column}, empty": "{row} 行 {column} 列、空白",
  "Row {row}, column {column}, {value}": "{row} 行 {column} 列、{value}",
  "Puzzle complete!": "数独完成！",
  "Share result": "結果を共有",
  "Creating image": "画像を作成中",
  "Result shared.": "結果を共有しました。",
  "Sharing is unavailable, so the result image was downloaded instead.":
    "共有できないため、結果画像をダウンロードしました。",
  "The result image could not be created. Please try again.":
    "結果画像を作成できませんでした。もう一度お試しください。",
} satisfies TranslationCatalog<typeof englishMessages>;
