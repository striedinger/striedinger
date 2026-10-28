import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "What Hugo is listening to": "Hugo が聴いている曲",
  "See what Hugo Striedinger is playing on Spotify right now.":
    "Hugo Striedinger が今 Spotify で聴いている曲をチェック。",
  "Press play to see what Hugo is listening to on Spotify":
    "再生をタップして、Hugo が Spotify で聴いている曲を見る",
  "What’s Hugo listening to right now?": "Hugo は今なにを聴いている？",
  "Press play to see": "再生をタップして見る",
  "Listening now": "再生中",
  Paused: "一時停止中",
  "Last played {time}": "最後の再生：{time}",
  "Recently played": "最近再生した曲",
  "Not listening right now": "今は何も聴いていません",
  "Nothing playing": "再生していません",
  "Check back in a bit": "また後で見てみてください",
  "Open in Spotify": "Spotify で開く",
  "Open Spotify": "Spotify を開く",
  "Playback position": "再生位置",
  "{elapsed} of {total}": "{elapsed} / {total}",
  "{album} cover": "{album} のジャケット",
};
