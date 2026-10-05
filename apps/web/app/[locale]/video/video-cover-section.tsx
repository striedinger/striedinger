import { Text } from "@workspace/ui/components/text";

import type { VideoEditorLabels } from "./types";

import { iosChipButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosListSection } from "../../../components/ios/ios-list-section";
import { formatClock } from "./captions";

interface VideoCoverSectionProps {
  cover: { time: number; url: string } | null;
  isCapturing: boolean;
  labels: VideoEditorLabels;
  onSaveCover: () => void;
  onUseCurrentFrame: () => void;
}

/** The frame embedded as the video's cover image, picked at the playhead. */
export function VideoCoverSection({
  cover,
  isCapturing,
  labels,
  onSaveCover,
  onUseCurrentFrame,
}: VideoCoverSectionProps) {
  return (
    <IosListSection className="px-0" header={labels.cover} footer={labels.coverFooter}>
      <li className="flex items-center gap-3 px-4 py-3">
        {cover ? (
          // A blob URL of a frame from the person's own video; next/image cannot load it.
          // oxlint-disable-next-line nextjs/no-img-element
          <img
            src={cover.url}
            alt={`${labels.cover} ${formatClock(cover.time)}`}
            className="h-16 w-auto max-w-28 shrink-0 rounded-ios-xs bg-black object-contain"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          {cover ? (
            <Text className="text-ios-footnote text-ios-secondary-label tabular-nums">
              {formatClock(cover.time)}
            </Text>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isCapturing}
              className={iosChipButtonClassName}
              onClick={onUseCurrentFrame}
            >
              {labels.useCurrentFrame}
            </button>
            {cover ? (
              <button type="button" className={iosChipButtonClassName} onClick={onSaveCover}>
                {labels.saveCoverImage}
              </button>
            ) : null}
          </div>
        </div>
      </li>
    </IosListSection>
  );
}
