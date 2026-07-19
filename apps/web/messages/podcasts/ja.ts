import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages = {
  Add: "追加",
  Added: "追加済み",
  "Back to shows": "番組一覧に戻る",
  Cancel: "キャンセル",
  "Close player": "プレーヤーを閉じる",
  "Cover art": "カバーアート",
  "Find a show, save it for later, and listen without creating an account.":
    "番組を見つけて保存し、アカウントを作らずに聴けます。",
  "Download episode": "エピソードをダウンロード",
  "Your library is empty. Add a show from Explore to get started.":
    "ライブラリは空です。「見つける」から番組を追加してください。",
  "Episodes you start will appear here so you can pick up where you left off.":
    "聴き始めたエピソードがここに表示され、続きから再生できます。",
  episodes: "エピソード",
  Explicit: "露骨な内容",
  Explore: "見つける",
  h: "時間",
  "In progress": "再生途中",
  "Latest episodes": "最新エピソード",
  "Last updated": "最終更新",
  "Your library": "ライブラリ",
  "Now playing": "再生中",
  "Episodes are unavailable right now. Please try another show.":
    "現在エピソードを利用できません。別の番組をお試しください。",
  "Loading the latest episodes…": "最新エピソードを読み込み中…",
  "Local library": "ローカルライブラリ",
  "Your library stays on this device.": "ライブラリはこのデバイスに保存されます。",
  m: "分",
  "No podcasts found. Try a show, host, or topic.":
    "ポッドキャストが見つかりません。番組、人物、トピックで検索してください。",
  Pause: "一時停止",
  "Playback position": "再生位置",
  "Open picture in picture": "ピクチャーインピクチャーを開く",
  Play: "再生",
  "View on Apple Podcasts": "Apple Podcastsで見る",
  "Popular right now": "現在の人気番組",
  "Podcast discovery data is provided by Apple. Audio is streamed directly from each podcast publisher. Downloads depend on the publisher and your browser.":
    "ポッドキャストの検索データはAppleから提供されています。音声は各配信元から直接ストリーミングされます。ダウンロードは配信元とブラウザによって異なります。",
  Remove: "削除",
  "Remove from in progress": "再生途中から削除",
  "Your saved listening position for this episode will be deleted.":
    "このエピソードの保存済み再生位置が削除されます。",
  "Remove saved progress?": "保存した進捗を削除しますか？",
  Resume: "続きから再生",
  Search: "検索",
  "Search is unavailable right now. Please try again.":
    "現在検索を利用できません。もう一度お試しください。",
  "Search shows, people, or topics": "番組、人物、トピックを検索",
  "Search results": "検索結果",
  "Searching podcasts": "ポッドキャストを検索中",
  "Show episodes": "エピソードを表示",
  Podcasts: "ポッドキャスト",
} satisfies TranslationCatalog<typeof englishMessages>;
