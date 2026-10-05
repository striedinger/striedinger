import type { VideoDetails, VideoEditorLabels, VideoInfo } from "./types";

import { IosListSection } from "../../../components/ios/ios-list-section";
import { IosSwitchRow } from "../../../components/ios/ios-switch-row";
import { IosValueRow } from "../../../components/ios/ios-value-row";
import { formatBytes } from "../../../lib/format-bytes";
import { formatClock } from "./captions";

interface VideoDetailsSectionProps {
  details: VideoDetails;
  fileSize: number;
  info: VideoInfo;
  labels: VideoEditorLabels;
  onDetailsChange: (details: VideoDetails) => void;
}

const fieldRowClassName =
  "relative px-4 not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-4 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator";
const fieldClassName =
  "block w-full resize-none bg-transparent py-2.75 text-ios-body text-ios-label caret-ios-tint outline-none placeholder:text-ios-tertiary-label";

/** The metadata written into the exported file, and facts about the original. */
export function VideoDetailsSection({
  details,
  fileSize,
  info,
  labels,
  onDetailsChange,
}: VideoDetailsSectionProps) {
  const format = [info.videoCodec, info.audioCodec]
    .filter(Boolean)
    .map(function toUpperCase(codec) {
      return String(codec).toUpperCase();
    })
    .join(" · ");

  return (
    <>
      <IosListSection
        className="px-0"
        header={labels.details}
        footer={info.hasLocation ? labels.removeLocationFooter : undefined}
      >
        <li className={fieldRowClassName}>
          <input
            type="text"
            value={details.title}
            aria-label={labels.videoTitle}
            placeholder={labels.videoTitle}
            maxLength={200}
            className={fieldClassName}
            onChange={function editTitle(event) {
              onDetailsChange({ ...details, title: event.currentTarget.value });
            }}
          />
        </li>
        <li className={fieldRowClassName}>
          <textarea
            rows={3}
            value={details.description}
            aria-label={labels.videoDescription}
            placeholder={labels.videoDescription}
            maxLength={2_000}
            className={fieldClassName}
            onChange={function editDescription(event) {
              onDetailsChange({ ...details, description: event.currentTarget.value });
            }}
          />
        </li>
        {info.hasLocation ? (
          <IosSwitchRow
            checked={details.removeLocation}
            label={labels.removeLocation}
            onCheckedChange={function toggleLocation(removeLocation) {
              onDetailsChange({ ...details, removeLocation });
            }}
          />
        ) : null}
      </IosListSection>
      <IosListSection className="px-0">
        <IosValueRow label={labels.duration} value={formatClock(info.duration)} />
        <IosValueRow label={labels.resolution} value={`${info.width} × ${info.height}`} />
        {info.frameRate ? (
          <IosValueRow
            label={labels.frameRate}
            value={labels.framesPerSecond.replace(
              "{fps}",
              String(Math.round(info.frameRate * 100) / 100),
            )}
          />
        ) : null}
        {format ? <IosValueRow label={labels.format} value={format} /> : null}
        <IosValueRow label={labels.fileSize} value={formatBytes(fileSize)} />
      </IosListSection>
    </>
  );
}
