"use client";

import { Text } from "@workspace/ui/components/text";
import { useEffect, useEffectEvent, useState } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { PdfToolLabels } from "./types";

import { iosChipButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosIntelligenceCard } from "../../../components/ios/ios-intelligence-card";
import { copyText } from "../../../lib/copy-text";
import { readStreamedText } from "../../../lib/on-device-ai/on-device-ai-session";
import { useOnDeviceAiTask } from "../../../lib/on-device-ai/use-on-device-ai-task";
import { extractPdfText } from "./extract-pdf-text";
import { getPdfSummaryOptions } from "./pdf-summary-options";

interface PdfSummaryCardProps {
  aiLabels: OnDeviceAiLabels;
  file: File;
  labels: PdfToolLabels;
  locale: string;
  onClose: () => void;
  password: string;
}

/** Key points of the document's text, summarized on the device. Loaded on first use. */
export function PdfSummaryCard({
  aiLabels,
  file,
  labels,
  locale,
  onClose,
  password,
}: PdfSummaryCardProps) {
  const task = useOnDeviceAiTask();
  const [summary, setSummary] = useState("");
  const [hasNoText, setHasNoText] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const summarize = useEffectEvent(function summarizeDocument() {
    void task.run(async function summarizeText({ monitor, signal }) {
      // Creating the summarizer first keeps the tap's permission to download the model.
      const summarizer = await Summarizer.create({
        ...getPdfSummaryOptions(locale),
        sharedContext: `A PDF document named ${file.name}.`,
        monitor,
        signal,
      });
      try {
        const text = await extractPdfText(file, password);
        if (!text) {
          setHasNoText(true);
          return "";
        }
        let input = text;
        const usage = await summarizer.measureInputUsage(input);
        if (usage > summarizer.inputQuota) {
          input = input.slice(0, Math.floor((input.length * summarizer.inputQuota) / usage) - 200);
        }
        return await readStreamedText(summarizer.summarizeStreaming(input, { signal }), setSummary);
      } finally {
        summarizer.destroy();
      }
    });
  });

  // The card opens from a tap on Summarize and is keyed by file, so it starts once.
  useEffect(function summarizeOnOpen() {
    summarize();
  }, []);

  async function copySummary() {
    if (await copyText(summary)) setIsCopied(true);
  }

  return (
    <IosIntelligenceCard
      closeLabel={labels.closeSummary}
      labels={aiLabels}
      onClose={onClose}
      status={task.status}
      title={labels.summaryTitle}
      actions={
        summary && task.status.kind === "done" ? (
          <button type="button" className={iosChipButtonClassName} onClick={copySummary}>
            {isCopied ? labels.summaryCopied : labels.copySummary}
          </button>
        ) : undefined
      }
    >
      {hasNoText ? (
        <Text className="text-ios-body text-ios-secondary-label">{labels.noText}</Text>
      ) : summary ? (
        <Text className="text-ios-body whitespace-pre-line text-ios-label">{summary}</Text>
      ) : null}
    </IosIntelligenceCard>
  );
}
