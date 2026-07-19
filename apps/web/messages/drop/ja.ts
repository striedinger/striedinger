import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Add files": "ファイルを追加",
  "Files in this session": "このセッションのファイル",
  "Link copied": "リンクをコピーしました",
  "Could not copy the link. Copy the room code instead.":
    "リンクをコピーできませんでした。代わりにルームコードをコピーしてください。",
  "Copy invite link": "招待リンクをコピー",
  "Sent directly": "直接送信済み",
  Download: "ダウンロード",
  "Drop to share": "ドロップして共有",
  "Drop files here": "ここにファイルをドロップ",
  "End-to-end encrypted": "エンドツーエンド暗号化",
  "1 file": "1 ファイル",
  "Received file failed its integrity check": "受信ファイルの整合性を確認できませんでした",
  "Larger than the 100 MB browser limit": "ブラウザの上限 100 MB を超えています",
  "{count} files": "{count} ファイル",
  Join: "参加",
  "Have a room code?": "ルームコードをお持ちですか？",
  "Enter the complete 16-character room code.": "16 文字のルームコードを入力してください。",
  "Files you select or receive will appear here.":
    "選択または受信したファイルがここに表示されます。",
  "Waiting for another device": "別のデバイスを待っています",
  "1 device connected": "1 台のデバイスが接続中",
  "{count} devices connected": "{count} 台のデバイスが接続中",
  "Preparing…": "準備中…",
  "Files stay in your browser until a device connects. Up to 100 MB each.":
    "デバイスが接続するまでファイルはブラウザ内に保持されます。1 ファイル最大 100 MB。",
  "Your room": "あなたのルーム",
  "A direct connection could not be established. Try another network or browser.":
    "直接接続を確立できませんでした。別のネットワークまたはブラウザをお試しください。",
  Retry: "再試行",
  "Select files": "ファイルを選択",
  Sending: "送信中",
  "Share invite": "招待を共有",
  "Send the private link or room code to another device.":
    "プライベートリンクまたはルームコードを別のデバイスに送信してください。",
  "Transfer failed": "転送に失敗しました",
  "Ready to send": "送信準備完了",
};
