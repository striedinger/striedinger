import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "What Hugo is listening to": "Hugo 正在听什么",
  "See what Hugo Striedinger is playing on Spotify right now.":
    "看看 Hugo Striedinger 此刻在 Spotify 上听什么。",
  "Press play to see what Hugo is listening to on Spotify":
    "点按播放，看看 Hugo 在 Spotify 上听什么",
  "What’s Hugo listening to right now?": "Hugo 现在在听什么？",
  "Press play to see": "点按播放查看",
  "Listening now": "正在收听",
  Paused: "已暂停",
  "Last played {time}": "上次播放：{time}",
  "Recently played": "最近播放",
  "Not listening right now": "现在没有在听",
  "Nothing playing": "没有在播放",
  "Check back in a bit": "稍后再来看看",
  "Open in Spotify": "在 Spotify 中打开",
  "Open Spotify": "打开 Spotify",
  "Playback position": "播放位置",
  "{elapsed} of {total}": "{elapsed} / {total}",
  "{album} cover": "{album} 封面",
  "Hugo’s Spotify": "Hugo 的 Spotify",
  "Press play for what’s on now": "点按播放，看看现在在放什么",
};
