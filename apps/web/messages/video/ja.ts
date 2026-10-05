import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "Video Editor": "ビデオエディター",
  "Video Trimmer, Caption, and Metadata Editor": "動画のトリミング、字幕、メタデータ編集",
  "Trim videos, edit details, pick a cover frame, and add captions entirely in your browser. Your video never leaves this device.":
    "動画のトリミング、詳細の編集、カバーフレームの選択、字幕の追加をすべてブラウザ内で行えます。動画がこのデバイスの外に出ることはありません。",
  "Choose Video": "ビデオを選択",
  "Choose Another": "別のビデオを選択",
  "Drop a video here": "ここにビデオをドロップ",
  "Drop to open the video": "ドロップしてビデオを開く",
  "MP4, MOV, and WebM": "MP4、MOV、WebM",
  "Your video stays on this device. Editing happens entirely in your browser.":
    "ビデオはこのデバイスにとどまります。編集はすべてブラウザ内で行われます。",
  "This browser can’t edit videos. Try a recent version of Chrome, Edge, Safari, or Firefox.":
    "このブラウザではビデオを編集できません。最新の Chrome、Edge、Safari、Firefox をお試しください。",
  "This file couldn’t be opened as a video.": "このファイルをビデオとして開けませんでした。",
  Play: "再生",
  Pause: "一時停止",
  Trim: "トリミング",
  "Trim start": "開始位置",
  "Trim end": "終了位置",
  Playhead: "再生ヘッド",
  "{duration} selected": "{duration} を選択中",
  "Exact Cut Points": "正確なカット位置",
  "Exact cuts re-encode the video, which takes longer. Otherwise cuts snap to the nearest keyframe and the video is copied without quality loss.":
    "正確なカットではビデオを再エンコードするため時間がかかります。オフの場合は最も近いキーフレームに合わせてカットされ、画質を落とさずにコピーされます。",
  "Cover Frame": "カバーフレーム",
  "Use Current Frame": "現在のフレームを使用",
  "Save Image": "画像を保存",
  "The cover frame is embedded in the exported video.":
    "カバーフレームは書き出したビデオに埋め込まれます。",
  Details: "詳細",
  Title: "タイトル",
  Description: "説明",
  "Remove Location": "位置情報を削除",
  "Removes where the video was recorded from the exported file.":
    "書き出したファイルから撮影場所を削除します。",
  Duration: "長さ",
  Resolution: "解像度",
  "Frame Rate": "フレームレート",
  "File Size": "ファイルサイズ",
  Format: "フォーマット",
  Captions: "字幕",
  "Add Caption": "字幕を追加",
  "Caption text": "字幕テキスト",
  "Delete caption": "字幕を削除",
  "Add captions at the playhead, or generate them from the audio.":
    "再生ヘッドの位置に字幕を追加するか、音声から生成します。",
  "Captions in Export": "書き出し時の字幕",
  "Subtitle Track": "字幕トラック",
  "Burned In": "焼き込み",
  "Download Captions": "字幕をダウンロード",
  "Generate Captions": "字幕を生成",
  "Uses the Whisper speech model on this device. The first time, it downloads about {size}.":
    "このデバイス上で Whisper 音声モデルを使います。初回は約 {size} をダウンロードします。",
  "Listening to the audio…": "音声を解析中…",
  "This video has no audio to caption.": "このビデオには字幕を付ける音声がありません。",
  "Captions can be generated for up to 20 minutes at a time. Trim the video first.":
    "字幕は一度に最長 20 分まで生成できます。先にビデオをトリミングしてください。",
  "No speech was found in this part of the video.":
    "ビデオのこの部分には音声が見つかりませんでした。",
  "Export Video": "ビデオを書き出す",
  "Exporting… {percent}": "書き出し中… {percent}",
  Cancel: "キャンセル",
  "This video couldn’t be exported.": "このビデオを書き出せませんでした。",
  "Save Video": "ビデオを保存",
  "{fps} fps": "{fps} fps",
});
