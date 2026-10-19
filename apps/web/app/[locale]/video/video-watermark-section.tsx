"use client";

import { Text } from "@workspace/ui/components/text";
import { useRef, useState } from "react";

import type {
  VideoEditorLabels,
  VideoWatermark,
  WatermarkLogo,
  WatermarkMotion,
  WatermarkSize,
} from "./types";

import { iosChipButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosListSection } from "../../../components/ios/ios-list-section";
import { getNumberFormat } from "../../../lib/intl-cache";
import { loadWatermarkLogo, watermarkLogoTypes } from "./load-watermark-logo";
import { fieldClassName, fieldRowClassName } from "./video-field-styles";
import { VideoSegmentedSetting } from "./video-segmented-setting";

interface VideoWatermarkSectionProps {
  labels: VideoEditorLabels;
  locale: string;
  onLogoChange: (logo: WatermarkLogo | null) => void;
  onWatermarkChange: (watermark: VideoWatermark) => void;
  watermark: VideoWatermark;
}

const opacityOptions = ["0.5", "0.75", "1"] as const;

/** Text and an optional logo burned into every frame, hopping between corners or fixed. */
export function VideoWatermarkSection({
  labels,
  locale,
  onLogoChange,
  onWatermarkChange,
  watermark,
}: VideoWatermarkSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasLogoError, setHasLogoError] = useState(false);
  const hasWatermark = watermark.text.trim() !== "" || watermark.logo !== null;
  const percent = getNumberFormat(locale, { style: "percent" });

  async function chooseLogo(file: File) {
    const logo = await loadWatermarkLogo(file);
    setHasLogoError(!logo);
    if (logo) onLogoChange(logo);
  }

  return (
    <div className="flex flex-col gap-3">
      <IosListSection className="px-0" header={labels.watermark} footer={labels.watermarkFooter}>
        <li className={fieldRowClassName}>
          <input
            type="text"
            value={watermark.text}
            aria-label={labels.watermarkText}
            placeholder={labels.watermarkPlaceholder}
            maxLength={40}
            className={fieldClassName}
            onChange={function editText(event) {
              onWatermarkChange({ ...watermark, text: event.currentTarget.value });
            }}
          />
        </li>
        <li className="flex min-h-13 items-center gap-3 px-4 py-2">
          {watermark.logo ? (
            // The logo is a small PNG made from the person's own upload.
            // oxlint-disable-next-line nextjs/no-img-element
            <img
              src={watermark.logo.url}
              alt=""
              className="size-9 shrink-0 rounded-ios-xs bg-ios-tertiary-fill object-contain p-1"
            />
          ) : null}
          <button
            type="button"
            className={iosChipButtonClassName}
            onClick={function openLogoPicker() {
              fileInputRef.current?.click();
            }}
          >
            {watermark.logo ? labels.replaceLogo : labels.addLogo}
          </button>
          {watermark.logo ? (
            <button
              type="button"
              className={iosChipButtonClassName}
              onClick={function removeLogo() {
                setHasLogoError(false);
                onLogoChange(null);
              }}
            >
              {labels.removeLogo}
            </button>
          ) : null}
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept={watermarkLogoTypes.join(",")}
            tabIndex={-1}
            aria-hidden="true"
            onChange={function selectLogo(event) {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void chooseLogo(file);
            }}
          />
        </li>
      </IosListSection>
      {hasLogoError ? (
        <Text role="alert" className="px-5 text-ios-footnote text-ios-red">
          {labels.logoInvalid}
        </Text>
      ) : null}
      {hasWatermark ? (
        <div className="flex flex-col gap-3 px-1">
          <VideoSegmentedSetting<WatermarkMotion>
            label={labels.watermarkMotion}
            options={[
              { label: labels.watermarkMoving, value: "hop" },
              { label: labels.watermarkFixed, value: "fixed" },
            ]}
            value={watermark.motion}
            onChange={function changeMotion(motion) {
              onWatermarkChange({ ...watermark, motion });
            }}
          />
          <VideoSegmentedSetting<WatermarkSize>
            label={labels.watermarkSize}
            options={[
              { label: labels.sizeSmall, value: "small" },
              { label: labels.sizeMedium, value: "medium" },
              { label: labels.sizeLarge, value: "large" },
            ]}
            value={watermark.size}
            onChange={function changeSize(size) {
              onWatermarkChange({ ...watermark, size });
            }}
          />
          <VideoSegmentedSetting
            label={labels.watermarkOpacity}
            options={opacityOptions.map(function toOption(option) {
              return { label: percent.format(Number(option)), value: option };
            })}
            value={String(watermark.opacity)}
            onChange={function changeOpacity(opacity) {
              onWatermarkChange({ ...watermark, opacity: Number(opacity) });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
