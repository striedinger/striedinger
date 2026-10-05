"use client";

import { Text } from "@workspace/ui/components/text";
import { useEffect, useEffectEvent, useState } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { ImageDescription, ImageTextTranslation } from "./describe-image";
import type { ImageOptimizerLabels, OptimizerItem } from "./types";

import { iosChipButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosIntelligenceCard } from "../../../components/ios/ios-intelligence-card";
import { copyText } from "../../../lib/copy-text";
import { useOnDeviceAiTask } from "../../../lib/on-device-ai/use-on-device-ai-task";
import { describeImage, translateImageText } from "./describe-image";

interface ImageDescriptionCardProps {
  aiLabels: OnDeviceAiLabels;
  item: OptimizerItem;
  labels: ImageOptimizerLabels;
  locale: string;
  onClose: () => void;
  onRename: (id: string, fileStem: string) => void;
}

/** Alt text and a descriptive file name for one image, written by the on-device model. */
export function ImageDescriptionCard({
  aiLabels,
  item,
  labels,
  locale,
  onClose,
  onRename,
}: ImageDescriptionCardProps) {
  const task = useOnDeviceAiTask();
  const [description, setDescription] = useState<ImageDescription | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isRenamed, setIsRenamed] = useState(false);
  const [textTranslation, setTextTranslation] = useState<ImageTextTranslation | null>(null);
  const isBusy = task.status.kind === "working" || task.status.kind === "downloading";
  // The optimized copy is a format the model reads, even when the original is HEIC.
  const image = item.output ?? item.file;
  function describe() {
    void task
      .run(function requestDescription(context) {
        return describeImage(image, locale, context);
      })
      .then(function showDescription(result) {
        if (result) setDescription(result);
        return undefined;
      });
  }

  const startDescription = useEffectEvent(function describeWithModel() {
    describe();
  });

  // The card opens from a tap on Describe, and its parent keys it by image, so the
  // description starts once, right away.
  useEffect(function describeOnOpen() {
    startDescription();
  }, []);

  function translateText() {
    void task
      .run(function requestTranslation(context) {
        return translateImageText(image, locale, context);
      })
      .then(function showTranslation(result) {
        if (result) setTextTranslation(result);
        return undefined;
      });
  }

  async function copyAltText() {
    if (description && (await copyText(description.altText))) setIsCopied(true);
  }

  return (
    <IosIntelligenceCard
      closeLabel={labels.closeDescription}
      labels={aiLabels}
      onClose={onClose}
      onRetry={description ? translateText : describe}
      status={task.status}
      title={labels.describeTitle.replace("{name}", item.file.name)}
      actions={
        description ? (
          <>
            <button type="button" className={iosChipButtonClassName} onClick={copyAltText}>
              {isCopied ? labels.copiedAltText : labels.copyAltText}
            </button>
            <button
              type="button"
              disabled={isRenamed}
              className={iosChipButtonClassName}
              onClick={function useSuggestedName() {
                onRename(item.id, description.fileStem);
                setIsRenamed(true);
              }}
            >
              {isRenamed ? labels.renamed : labels.renameTo.replace("{name}", description.fileStem)}
            </button>
            {textTranslation ? null : (
              <button
                type="button"
                disabled={isBusy}
                className={iosChipButtonClassName}
                onClick={translateText}
              >
                {labels.translateText}
              </button>
            )}
          </>
        ) : undefined
      }
    >
      {description ? (
        <Text className="text-ios-body text-ios-label">{description.altText}</Text>
      ) : null}
      {textTranslation ? (
        textTranslation.text ? (
          <div className="flex flex-col gap-1 rounded-ios-md bg-ios-grouped-background px-3 py-2.5">
            <Text className="text-ios-footnote font-semibold text-ios-secondary-label">
              {labels.textInImage}
            </Text>
            <Text className="text-ios-subheadline whitespace-pre-line text-ios-secondary-label">
              {textTranslation.text}
            </Text>
            <Text lang={locale} className="text-ios-body whitespace-pre-line text-ios-label">
              {textTranslation.translation}
            </Text>
          </div>
        ) : (
          <Text className="text-ios-footnote text-ios-secondary-label">{labels.noTextInImage}</Text>
        )
      ) : null}
    </IosIntelligenceCard>
  );
}
