import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "SVG Editor": "SVG エディター",
  "SVG Viewer, Editor, and Optimizer": "SVG ビューア、エディター、最適化ツール",
  "Edit SVG code with a live preview, then optimize it or export it as a PNG. Everything stays in your browser.":
    "SVG コードをライブプレビューしながら編集し、最適化や PNG への書き出しができます。すべてブラウザ内で処理されます。",
  "SVG code": "SVG コード",
  "Paste SVG code here": "ここに SVG コードを貼り付け",
  Preview: "プレビュー",
  "Valid SVG": "有効な SVG",
  "Invalid SVG: {error}": "無効な SVG：{error}",
  "This document is not an SVG image.": "このドキュメントは SVG 画像ではありません。",
  "This SVG is too large to edit safely in the browser.":
    "この SVG は大きすぎるため、ブラウザで安全に編集できません。",
  "Enter valid SVG code to see a preview.":
    "プレビューを表示するには有効な SVG コードを入力してください。",
  "Your SVG stays in this browser and is never sent to the server.":
    "SVG はこのブラウザ内にとどまり、サーバーに送信されることはありません。",
  Background: "背景",
  Grid: "グリッド",
  Light: "ライト",
  Dark: "ダーク",
  Open: "開く",
  Optimize: "最適化",
  Copy: "コピー",
  Copied: "コピーしました",
  "Download SVG": "SVG をダウンロード",
  "Export PNG": "PNG を書き出す",
  "Optimized from {before} to {after}.": "{before} から {after} に最適化しました。",
  "This SVG is already optimized.": "この SVG はすでに最適化されています。",
  "This SVG could not be optimized.": "この SVG を最適化できませんでした。",
  "This file could not be opened as an SVG.": "このファイルを SVG として開けませんでした。",
  "This SVG could not be exported as a PNG.": "この SVG を PNG として書き出せませんでした。",
  Dimensions: "サイズ",
  "File size": "ファイルサイズ",
  Elements: "要素",
  "SVG actions": "SVG の操作",
  Details: "詳細",
  Share: "共有",
});
