import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "IP Address Information": "IP アドレス情報",
  "See the public IP address, approximate request location, and HTTP information visible to this website.":
    "このサイトから見える公開 IP アドレス、おおよそのリクエスト位置、HTTP 情報を確認します。",
  "The server reports the address and request metadata it receives from your connection.":
    "サーバーが接続から受信したアドレスとリクエストメタデータを表示します。",
  "This page does not use a third-party IP lookup service. Approximate location is shown only when the hosting platform provides it.":
    "このページは外部 IP 検索サービスを使用しません。おおよその位置はホスティング基盤が提供する場合のみ表示されます。",
  "Loading request details…": "リクエスト情報を読み込み中…",
  "Observed IP Address": "確認された IP アドレス",
  "IP address": "IP アドレス",
  "IP version": "IP バージョン",
  "Request Location": "リクエスト位置",
  "Location values are approximate and may identify a network exit point instead of your physical location.":
    "位置情報は概算であり、実際の現在地ではなくネットワークの出口を示す場合があります。",
  Country: "国",
  Region: "地域",
  City: "都市",
  "Time zone": "タイムゾーン",
  Latitude: "緯度",
  Longitude: "経度",
  "Request Details": "リクエスト詳細",
  Protocol: "プロトコル",
  Host: "ホスト",
  "Forwarded addresses": "転送されたアドレス",
  "HTTP Request Headers": "HTTP リクエストヘッダー",
  "Only privacy-safe request headers are displayed. Cookies, authorization values, and internal identifiers are excluded.":
    "プライバシー上安全なヘッダーのみ表示します。Cookie、認証値、内部識別子は除外されます。",
  "WebRTC Leak Test": "WebRTC リークテスト",
  "This optional test contacts Cloudflare's public STUN server and lists the ICE addresses exposed by your browser.":
    "この任意テストは Cloudflare の公開 STUN サーバーに接続し、ブラウザーが公開する ICE アドレスを一覧表示します。",
  "Run WebRTC test": "WebRTC テストを実行",
  "Testing…": "テスト中…",
  "Candidate type": "候補タイプ",
  Address: "アドレス",
  "No ICE candidates were exposed.": "ICE 候補は公開されませんでした。",
  "WebRTC is not supported by this browser.": "このブラウザーは WebRTC に対応していません。",
  "The WebRTC test could not complete.": "WebRTC テストを完了できませんでした。",
  Unavailable: "利用不可",
};
