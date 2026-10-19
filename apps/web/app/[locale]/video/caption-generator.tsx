"use client";

import { Text } from "@workspace/ui/components/text";
import { useEffect, useEffectEvent, useState } from "react";

import type {
  IosIntelligenceStatus,
  OnDeviceAiLabels,
} from "../../../components/ios/ios-intelligence-card";
import type { TranscriptionCommand, TranscriptionReply } from "./transcription-messages";
import type { VideoCaption, VideoEditorLabels, VideoTrim } from "./types";

import { IosIntelligenceCard } from "../../../components/ios/ios-intelligence-card";
import { getDisplayNames } from "../../../lib/intl-cache";
import { toLanguageTag } from "./caption-language";

interface CaptionGeneratorProps {
  aiLabels: OnDeviceAiLabels;
  file: File;
  labels: VideoEditorLabels;
  locale: string;
  /** Receives the captions and the spoken language Whisper detected, as its language code. */
  onCaptions: (captions: VideoCaption[], language: string | null) => void;
  onClose: () => void;
  trim: VideoTrim;
}

/** The language's name in the visitor's language, or its code if the browser lacks a name. */
function describeLanguage(whisperCode: string, locale: string) {
  try {
    return (
      getDisplayNames(locale, { type: "language" }).of(toLanguageTag(whisperCode)) ?? whisperCode
    );
  } catch {
    return whisperCode;
  }
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
  locale,
  onCaptions,
  onClose,
  trim,
}: CaptionGeneratorProps) {
  const [status, setStatus] = useState<IosIntelligenceStatus>({ kind: "working" });
  const [message, setMessage] = useState<string | null>(null);

  const startTranscription = useEffectEvent(function transcribe() {
    const worker = getTranscriptionWorker();
    const id = crypto.randomUUID();
    function send(command: TranscriptionCommand) {
      worker.postMessage(command);
    }
    function handleReply(event: MessageEvent<TranscriptionReply>) {
      const reply = event.data;
      // The worker may still be finishing a job this card no longer wants.
      if (reply.id !== id) return;
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
        if (reply.captions.length === 0) {
          setMessage(labels.noSpeech);
          return;
        }
        setMessage(
          reply.language
            ? labels.detectedLanguage.replace(
                "{language}",
                describeLanguage(reply.language, locale),
              )
            : null,
        );
        onCaptions(reply.captions, reply.language);
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
    send({ end: trim.end, file, id, kind: "transcribe", start: trim.start });
    return function stopTranscription() {
      worker.removeEventListener("message", handleReply);
      // Closing the card stops the job at its next stage instead of leaving Whisper running.
      send({ id, kind: "cancel" });
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
