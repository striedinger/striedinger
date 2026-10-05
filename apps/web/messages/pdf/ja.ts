import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "PDF Optimizer": "PDF 最適化",
  "PDF Compressor and Optimizer": "PDF 圧縮・最適化ツール",
  "Compress, preview, and remove PDF restrictions entirely in your browser.":
    "PDF の圧縮、プレビュー、制限の解除をすべてブラウザ内で行います。",
  Balanced: "バランス",
  "Choose PDF": "PDF を選択",
  "Compress PDF": "PDF を圧縮",
  "Compression mode": "圧縮モード",
  Download: "ダウンロード",
  "Drop PDF to start": "ドロップして開始",
  "Drop a PDF here": "ここに PDF をドロップ",
  "This PDF is locked. Enter its password to preview it.":
    "この PDF はロックされています。プレビューするにはパスワードを入力してください。",
  "Your PDF stays on this device.": "PDF はこのデバイスから出ません。",
  "That password did not open this PDF.": "このパスワードでは PDF を開けませんでした。",
  "Rendering preview": "プレビューを作成中",
  "Lossless rewrite": "ロスレス再書き込み",
  "The original was already smaller": "元のファイルのほうが小さいです",
  "Open PDF": "PDF を開く",
  pages: "ページ",
  "PDF password": "PDF のパスワード",
  "Enter a password you are authorized to use. It is never stored.":
    "使用を許可されたパスワードを入力してください。パスワードは保存されません。",
  Preview: "プレビュー",
  "Preparing PDF": "PDF を準備中",
  Quality: "画質",
  "Remove restrictions": "制限を解除",
  "Choose another": "別のファイルを選択",
  "Optimized PDF": "最適化された PDF",
  smaller: "縮小",
  "Smallest file": "最小ファイル",
  "One PDF at a time · processed locally": "一度に 1 つの PDF · ローカルで処理",
  "Restrictions removed": "制限を解除しました",
  "This PDF could not be opened in your browser.": "この PDF はブラウザで開けませんでした。",
  Close: "閉じる",
  "Copy Summary": "要約をコピー",
  "This PDF has no text to summarize, such as a scanned document.":
    "この PDF にはスキャンした文書など、要約できるテキストがありません。",
  "Summarize Document": "文書を要約",
  "Summary Copied": "要約をコピーしました",
  "Key Points": "重要なポイント",
  "This document is already in your language.": "この文書はすでにあなたの言語です。",
  "Translate Document": "文書を翻訳",
  "Translated from {language}": "{language}から翻訳",
  Translation: "翻訳",
  "Translation Copied": "翻訳をコピーしました",
  "Copy Translation": "翻訳をコピー",
};
