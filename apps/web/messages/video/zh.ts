import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "Video Editor": "视频编辑器",
  "Video Trimmer, Caption, and Metadata Editor": "视频剪辑、字幕与元数据编辑器",
  "Trim videos, edit details, pick a cover frame, and add captions entirely in your browser. Your video never leaves this device.":
    "完全在浏览器中剪辑视频、编辑详情、选择封面帧并添加字幕。你的视频绝不会离开此设备。",
  "Choose Video": "选择视频",
  "Choose Another": "选择其他",
  "Drop a video here": "将视频拖放到此处",
  "Drop to open the video": "松开以打开视频",
  "MP4, MOV, and WebM": "MP4、MOV 和 WebM",
  "Your video stays on this device. Editing happens entirely in your browser.":
    "你的视频保留在此设备上。编辑完全在浏览器中进行。",
  "This browser can’t edit videos. Try a recent version of Chrome, Edge, Safari, or Firefox.":
    "此浏览器无法编辑视频。请试用最新版本的 Chrome、Edge、Safari 或 Firefox。",
  "This file couldn’t be opened as a video.": "无法将此文件作为视频打开。",
  Play: "播放",
  Pause: "暂停",
  Trim: "剪辑",
  "Trim start": "开始位置",
  "Trim end": "结束位置",
  Playhead: "播放头",
  "{duration} selected": "已选择 {duration}",
  "Exact Cut Points": "精确剪切点",
  "Exact cuts re-encode the video, which takes longer. Otherwise cuts snap to the nearest keyframe and the video is copied without quality loss.":
    "精确剪切会重新编码视频，耗时更长。否则剪切点会对齐到最近的关键帧，视频将无损复制。",
  "Cover Frame": "封面帧",
  "Use Current Frame": "使用当前帧",
  "Save Image": "存储图像",
  "The cover frame is embedded in the exported video.": "封面帧会嵌入到导出的视频中。",
  Details: "详细信息",
  Title: "标题",
  Description: "描述",
  "Remove Location": "移除位置",
  "Removes where the video was recorded from the exported file.":
    "从导出的文件中移除视频的录制位置。",
  Duration: "时长",
  Resolution: "分辨率",
  "Frame Rate": "帧速率",
  "File Size": "文件大小",
  Format: "格式",
  Captions: "字幕",
  "Add Caption": "添加字幕",
  "Caption text": "字幕文本",
  "Delete caption": "删除字幕",
  "Add captions at the playhead, or generate them from the audio.":
    "在播放头处添加字幕，或根据音频生成字幕。",
  "Captions in Export": "导出中的字幕",
  "Subtitle Track": "字幕轨道",
  "Burned In": "烧录到画面",
  "Download Captions": "下载字幕",
  "Generate Captions": "生成字幕",
  "Uses the Whisper speech model on this device. The first time, it downloads about {size}.":
    "在此设备上使用 Whisper 语音模型。首次使用时会下载约 {size}。",
  "Listening to the audio…": "正在聆听音频…",
  "This video has no audio to caption.": "此视频没有可生成字幕的音频。",
  "Captions can be generated for up to 20 minutes at a time. Trim the video first.":
    "每次最多可为 20 分钟的视频生成字幕。请先剪辑视频。",
  "No speech was found in this part of the video.": "在视频的这一部分中未发现语音。",
  "Export Video": "导出视频",
  "Exporting… {percent}": "正在导出… {percent}",
  Cancel: "取消",
  "This video couldn’t be exported.": "无法导出此视频。",
  "Save Video": "存储视频",
  "{fps} fps": "{fps} fps",
});
