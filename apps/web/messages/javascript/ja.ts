import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "JavaScript Browser Information": "ブラウザーの JavaScript 情報",
  "Inspect the JavaScript, screen, navigator, media, network, and storage information exposed by your browser.":
    "ブラウザーが公開する JavaScript、画面、ナビゲーター、メディア、ネットワーク、ストレージ情報を確認します。",
  "Everything shown here is read locally in your browser and is not uploaded or stored.":
    "ここに表示される情報はブラウザー内で読み取られ、アップロードも保存もされません。",
  "Values are collected after the page loads and may change when browser permissions, windows, displays, or network conditions change.":
    "値はページ読み込み後に収集され、権限、ウィンドウ、ディスプレイ、ネットワーク状態によって変わる場合があります。",
  "JavaScript is disabled, so browser details cannot be collected.":
    "JavaScript が無効なため、ブラウザー情報を収集できません。",
  "Collecting browser details…": "ブラウザー情報を収集中…",
  "Refresh details": "情報を更新",
  Unavailable: "利用不可",
  Supported: "対応",
  "Not supported": "未対応",
  Enabled: "有効",
  "JavaScript and Document": "JavaScript とドキュメント",
  "Screen and Window": "画面とウィンドウ",
  "Date, Time, and Internationalization": "日付、時刻、国際化",
  Navigator: "ナビゲーター",
  "User-Agent Client Hints": "ユーザーエージェント・クライアントヒント",
  "Plugins and MIME Types": "プラグインと MIME タイプ",
  "Battery and Network": "バッテリーとネットワーク",
  "Media and Device APIs": "メディアとデバイス API",
  "Storage APIs": "ストレージ API",
  "Additional Navigator Properties": "その他のナビゲーター属性",
};
