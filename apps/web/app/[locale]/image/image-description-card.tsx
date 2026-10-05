"use client";

import { Text } from "@workspace/ui/components/text";
import { useEffect, useEffectEvent, useState } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { ImageDescription } from "./describe-image";
import type { ImageOptimizerLabels, OptimizerItem } from "./types";

import { iosChipButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosIntelligenceCard } from "../../../components/ios/ios-intelligence-card";
import { copyText } from "../../../lib/copy-text";
import { useOnDeviceAiTask } from "../../../lib/on-device-ai/use-on-device-ai-task";
import { describeImage } from "./describe-image";

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
  // The optimized copy is a format the model reads, even when the original is HEIC.
  const image = item.output ?? item.file;
  const describe = useEffectEvent(function describeWithModel() {
    void task
      .run(function requestDescription(context) {
        return describeImage(image, locale, context);
      })
      .then(function showDescription(result) {
        if (result) setDescription(result);
        return undefined;
      });
  });

  // The card opens from a tap on Describe, and its parent keys it by image, so the
  // description starts once, right away.
  useEffect(function describeOnOpen() {
    describe();
  }, []);

  async function copyAltText() {
    if (description && (await copyText(description.altText))) setIsCopied(true);
  }

  return (
    <IosIntelligenceCard
      closeLabel={labels.closeDescription}
      labels={aiLabels}
      onClose={onClose}
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
          </>
        ) : undefined
      }
    >
      {description ? (
        <Text className="text-ios-body text-ios-label">{description.altText}</Text>
      ) : null}
    </IosIntelligenceCard>
  );
}
