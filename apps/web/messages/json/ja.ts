import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "JSON Validator and Formatter": "JSON検証・整形ツール",
  "Validate, format, and explore JSON entirely in your browser. Your data never leaves this device.":
    "ブラウザ内だけでJSONを検証、整形、閲覧できます。データがこの端末から送信されることはありません。",
  "JSON input": "JSON入力",
  "Your JSON stays in this browser and is never sent to the server.":
    "JSONはこのブラウザ内に保持され、サーバーへ送信されることはありません。",
  "Paste JSON here": "ここにJSONを貼り付け",
  "Valid JSON": "有効なJSON",
  "Invalid JSON: {error}": "無効なJSON：{error}",
  Preview: "プレビュー",
  "Expand all": "すべて展開",
  "Collapse all": "すべて折りたたむ",
  "Expand value": "値を展開",
  "Collapse value": "値を折りたたむ",
  "Enter valid JSON to see an expandable preview.":
    "有効なJSONを入力すると、展開可能なプレビューが表示されます。",
  "This JSON is too large to process safely in the browser.":
    "このJSONは大きすぎるため、ブラウザで安全に処理できません。",
  "This JSON is valid but too complex to preview all at once.":
    "このJSONは有効ですが、複雑すぎるため一度にすべてをプレビューできません。",
});
