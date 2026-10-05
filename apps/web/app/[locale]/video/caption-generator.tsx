"use client";

import { Text } from "@workspace/ui/components/text";
import { useEffect, useEffectEvent, useState } from "react";

import type {
  IosIntelligenceStatus,
  OnDeviceAiLabels,
} from "../../../components/ios/ios-intelligence-card";
import type { TranscriptionReply } from "./transcription-messages";
import type { VideoCaption, VideoEditorLabels, VideoTrim } from "./types";

import { IosIntelligenceCard } from "../../../components/ios/ios-intelligence-card";

interface CaptionGeneratorProps {
  aiLabels: OnDeviceAiLabels;
  file: File;
  labels: VideoEditorLabels;
  onCaptions: (captions: VideoCaption[]) => void;
  onClose: () => void;
  trim: VideoTrim;
}

// One worker per page keeps Whisper loaded between runs.
let transcriptionWorker: Worker | null = null;

function getTranscriptionWorker() {
  transcriptionWorker ??= new Worker(new URL("./transcribe-worker.ts", import.meta.url), {
    type: "module",
  });
  return transcriptionWorker;
}

/** Transcribes the trimmed range with Whisper on the device and hands back timed captions. */
export function CaptionGenerator({
  aiLabels,
  file,
  labels,
  onCaptions,
  onClose,
  trim,
}: CaptionGeneratorProps) {
  const [status, setStatus] = useState<IosIntelligenceStatus>({ kind: "working" });
  const [message, setMessage] = useState<string | null>(null);

  const startTranscription = useEffectEvent(function transcribe() {
    const worker = getTranscriptionWorker();
    function handleReply(event: MessageEvent<TranscriptionReply>) {
      const reply = event.data;
      if (reply.kind === "download") {
        setStatus(
          reply.progress < 1
            ? { kind: "downloading", progress: reply.progress }
            : { kind: "working" },
        );
        return;
      }
      if (reply.kind === "transcribing") {
        setStatus({ kind: "working" });
        setMessage(labels.listening);
        return;
      }
      worker.removeEventListener("message", handleReply);
      if (reply.kind === "done") {
        setStatus({ kind: "done" });
        setMessage(reply.captions.length === 0 ? labels.noSpeech : null);
        if (reply.captions.length > 0) onCaptions(reply.captions);
        return;
      }
      setStatus(reply.reason === "failed" ? { kind: "error" } : { kind: "done" });
      setMessage(
        reply.reason === "no-audio"
          ? labels.noAudio
          : reply.reason === "too-long"
            ? labels.tooLongToTranscribe
            : null,
      );
    }
    worker.addEventListener("message", handleReply);
    worker.postMessage({ end: trim.end, file, start: trim.start });
    return function stopListening() {
      worker.removeEventListener("message", handleReply);
    };
  });

  // The card opens from a tap on Generate Captions, so transcription starts right away.
  useEffect(function transcribeOnOpen() {
    return startTranscription();
  }, []);

  return (
    <IosIntelligenceCard
      closeLabel={labels.cancel}
      labels={aiLabels}
      onClose={onClose}
      status={status}
      title={labels.generateCaptions}
    >
      {message ? (
        <Text className="text-ios-subheadline text-ios-secondary-label">{message}</Text>
      ) : null}
    </IosIntelligenceCard>
  );
}
