import { defineMessages } from "@workspace/i18n";

export const messages = defineMessages({
  "Video Editor": "Video Editor",
  "Video Trimmer, Caption, and Metadata Editor": "Video Trimmer, Caption, and Metadata Editor",
  "Trim videos, edit details, pick a cover frame, and add captions entirely in your browser. Your video never leaves this device.":
    "Trim videos, edit details, pick a cover frame, and add captions entirely in your browser. Your video never leaves this device.",
  "Choose Video": "Choose Video",
  "Choose Another": "Choose Another",
  "Drop a video here": "Drop a video here",
  "Drop to open the video": "Drop to open the video",
  "MP4, MOV, and WebM": "MP4, MOV, and WebM",
  "Your video stays on this device. Editing happens entirely in your browser.":
    "Your video stays on this device. Editing happens entirely in your browser.",
  "This browser can’t edit videos. Try a recent version of Chrome, Edge, Safari, or Firefox.":
    "This browser can’t edit videos. Try a recent version of Chrome, Edge, Safari, or Firefox.",
  "This file couldn’t be opened as a video.": "This file couldn’t be opened as a video.",
  Play: "Play",
  Pause: "Pause",
  Trim: "Trim",
  "Trim start": "Trim start",
  "Trim end": "Trim end",
  Playhead: "Playhead",
  "{duration} selected": "{duration} selected",
  "Exact Cut Points": "Exact Cut Points",
  "Exact cuts re-encode the video, which takes longer. Otherwise cuts snap to the nearest keyframe and the video is copied without quality loss.":
    "Exact cuts re-encode the video, which takes longer. Otherwise cuts snap to the nearest keyframe and the video is copied without quality loss.",
  "Cover Frame": "Cover Frame",
  "Use Current Frame": "Use Current Frame",
  "Save Image": "Save Image",
  "The cover frame is embedded in the exported video.":
    "The cover frame is embedded in the exported video.",
  Details: "Details",
  Title: "Title",
  Description: "Description",
  "Remove Location": "Remove Location",
  "Removes where the video was recorded from the exported file.":
    "Removes where the video was recorded from the exported file.",
  Duration: "Duration",
  Resolution: "Resolution",
  "Frame Rate": "Frame Rate",
  "File Size": "File Size",
  Format: "Format",
  Captions: "Captions",
  "Add Caption": "Add Caption",
  "Caption text": "Caption text",
  "Delete caption": "Delete caption",
  "Add captions at the playhead, or generate them from the audio.":
    "Add captions at the playhead, or generate them from the audio.",
  "Captions in Export": "Captions in Export",
  "Subtitle Track": "Subtitle Track",
  "Burned In": "Burned In",
  "Download Captions": "Download Captions",
  "Generate Captions": "Generate Captions",
  "Uses the Whisper speech model on this device. The first time, it downloads about {size}.":
    "Uses the Whisper speech model on this device. The first time, it downloads about {size}.",
  "Listening to the audio…": "Listening to the audio…",
  "This video has no audio to caption.": "This video has no audio to caption.",
  "Captions can be generated for up to 20 minutes at a time. Trim the video first.":
    "Captions can be generated for up to 20 minutes at a time. Trim the video first.",
  "No speech was found in this part of the video.":
    "No speech was found in this part of the video.",
  "Export Video": "Export Video",
  "Exporting… {percent}": "Exporting… {percent}",
  Cancel: "Cancel",
  "This video couldn’t be exported.": "This video couldn’t be exported.",
  "Save Video": "Save Video",
  "{fps} fps": "{fps} fps",
});
