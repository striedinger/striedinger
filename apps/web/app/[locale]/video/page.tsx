import type { Metadata } from "next";

import type { VideoEditorLabels } from "./types";

import { JsonLd } from "../../../components/json-ld";
import { getOnDeviceAiLabels } from "../../../lib/on-device-ai/get-on-device-ai-labels";
import { createPageMetadata, createWebApplicationStructuredData } from "../../../lib/seo";
import { getVideoTranslator } from "../../../messages/video/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { VideoEditor } from "./video-editor";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getVideoTranslator(locale);
  const title = translate("Video Trimmer, Caption, and Metadata Editor");
  const description = translate(
    "Trim videos, edit details, pick a cover frame, and add captions entirely in your browser. Your video never leaves this device.",
  );

  return createPageMetadata({ title, description, locale, path: "/video" });
}

export default async function VideoPage() {
  const locale = await getRequestLocale();
  const translate = await getVideoTranslator(locale);
  const labels: VideoEditorLabels = {
    addCaption: translate("Add Caption"),
    cancel: translate("Cancel"),
    captionBurned: translate("Burned In"),
    captionMode: translate("Captions in Export"),
    captionText: translate("Caption text"),
    captionTrack: translate("Subtitle Track"),
    captions: translate("Captions"),
    chooseAnother: translate("Choose Another"),
    chooseVideo: translate("Choose Video"),
    cover: translate("Cover Frame"),
    coverFooter: translate("The cover frame is embedded in the exported video."),
    deleteCaption: translate("Delete caption"),
    description: translate(
      "Trim videos, edit details, pick a cover frame, and add captions entirely in your browser. Your video never leaves this device.",
    ),
    details: translate("Details"),
    downloadCaptions: translate("Download Captions"),
    dropActive: translate("Drop to open the video"),
    dropPrompt: translate("Drop a video here"),
    duration: translate("Duration"),
    exactCuts: translate("Exact Cut Points"),
    exactCutsFooter: translate(
      "Exact cuts re-encode the video, which takes longer. Otherwise cuts snap to the nearest keyframe and the video is copied without quality loss.",
    ),
    export: translate("Export Video"),
    exportFailed: translate("This video couldn’t be exported."),
    exporting: translate("Exporting… {percent}"),
    fileSize: translate("File Size"),
    format: translate("Format"),
    frameRate: translate("Frame Rate"),
    framesPerSecond: translate("{fps} fps"),
    generateCaptions: translate("Generate Captions"),
    generateFooter: translate(
      "Uses the Whisper speech model on this device. The first time, it downloads about {size}.",
    ),
    listening: translate("Listening to the audio…"),
    noAudio: translate("This video has no audio to caption."),
    noCaptions: translate("Add captions at the playhead, or generate them from the audio."),
    noSpeech: translate("No speech was found in this part of the video."),
    openFailed: translate("This file couldn’t be opened as a video."),
    pause: translate("Pause"),
    play: translate("Play"),
    playhead: translate("Playhead"),
    privacy: translate(
      "Your video stays on this device. Editing happens entirely in your browser.",
    ),
    removeLocation: translate("Remove Location"),
    removeLocationFooter: translate("Removes where the video was recorded from the exported file."),
    resolution: translate("Resolution"),
    saveCoverImage: translate("Save Image"),
    saveVideo: translate("Save Video"),
    selected: translate("{duration} selected"),
    supported: translate("MP4, MOV, and WebM"),
    title: translate("Video Editor"),
    tooLongToTranscribe: translate(
      "Captions can be generated for up to 20 minutes at a time. Trim the video first.",
    ),
    trim: translate("Trim"),
    trimEnd: translate("Trim end"),
    trimStart: translate("Trim start"),
    unsupported: translate(
      "This browser can’t edit videos. Try a recent version of Chrome, Edge, Safari, or Firefox.",
    ),
    useCurrentFrame: translate("Use Current Frame"),
    videoDescription: translate("Description"),
    videoTitle: translate("Title"),
  };
  const structuredData = createWebApplicationStructuredData({
    name: labels.title,
    description: labels.description,
    applicationCategory: "MultimediaApplication",
    browserRequirements: "Requires JavaScript and WebCodecs",
    featureList: [labels.trim, labels.captions, labels.cover, labels.removeLocation],
    locale,
    path: "/video",
  });

  return (
    <>
      <JsonLd value={structuredData} />
      <VideoEditor aiLabels={getOnDeviceAiLabels(translate)} labels={labels} locale={locale} />
    </>
  );
}
