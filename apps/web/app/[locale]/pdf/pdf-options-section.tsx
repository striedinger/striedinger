"use client";

import { LockIcon } from "@workspace/icons/lock-icon";
import { Text } from "@workspace/ui/components/text";

import type { PdfCompressionMode, PdfToolLabels } from "./types";

import { IosListSection } from "../../../components/ios/ios-list-section";
import { IosSegmentedControl } from "../../../components/ios/ios-segmented-control";

interface PdfOptionsSectionProps {
  canRemoveRestrictions: boolean;
  compressionMode: PdfCompressionMode;
  labels: PdfToolLabels;
  onCompressionModeChange: (compressionMode: PdfCompressionMode) => void;
  onPasswordInputChange: (passwordInput: string) => void;
  onPasswordSubmit: () => void;
  onQualityChange: (quality: number) => void;
  onRemoveRestrictions: () => void;
  passwordInput: string;
  quality: number;
  requiresPassword: boolean;
}

/** The password, compression, and restriction options as inset grouped sections. */
export function PdfOptionsSection({
  canRemoveRestrictions,
  compressionMode,
  labels,
  onCompressionModeChange,
  onPasswordInputChange,
  onPasswordSubmit,
  onQualityChange,
  onRemoveRestrictions,
  passwordInput,
  quality,
  requiresPassword,
}: PdfOptionsSectionProps) {
  return (
    <>
      {requiresPassword ? (
        <form
          onSubmit={function submitPassword(event) {
            event.preventDefault();
            onPasswordSubmit();
          }}
        >
          <IosListSection className="px-0" header={labels.password} footer={labels.passwordHelp}>
            <li className="flex min-h-[48px] items-center gap-2 pr-2 pl-4">
              <label htmlFor="pdf-password" className="sr-only">
                {labels.password}
              </label>
              <input
                id="pdf-password"
                type="password"
                value={passwordInput}
                autoComplete="off"
                placeholder={labels.password}
                onChange={function changePassword(event) {
                  onPasswordInputChange(event.target.value);
                }}
                className="min-w-0 flex-1 bg-transparent py-3 text-ios-body text-ios-label outline-none placeholder:text-ios-tertiary-label"
              />
              <button
                type="submit"
                disabled={!passwordInput}
                className="h-8 shrink-0 rounded-full bg-ios-tint px-4 text-ios-subheadline font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:opacity-70 disabled:bg-ios-fill disabled:text-ios-tertiary-label"
              >
                {labels.open}
              </button>
            </li>
          </IosListSection>
        </form>
      ) : null}
      <IosListSection className="px-0" header={labels.compressionMode}>
        <li className="relative px-4 py-3 not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-4 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator">
          <IosSegmentedControl
            label={labels.compressionMode}
            value={compressionMode}
            onChange={onCompressionModeChange}
            options={[
              { label: labels.balanced, value: "balanced" },
              { label: labels.smallest, value: "smallest" },
              { label: labels.lossless, value: "lossless" },
            ]}
          />
        </li>
        {compressionMode === "smallest" ? (
          <li className="flex min-h-[52px] items-center gap-3 px-4">
            <Text as="span" aria-hidden="true" className="text-ios-body text-ios-label">
              {labels.quality}
            </Text>
            <input
              type="range"
              min="35"
              max="95"
              value={quality}
              aria-label={labels.quality}
              aria-valuetext={`${quality}%`}
              onChange={function changeQuality(event) {
                onQualityChange(Number(event.target.value));
              }}
              className="h-7 min-w-0 flex-1 cursor-pointer accent-ios-tint"
            />
            <Text
              as="span"
              aria-hidden="true"
              className="w-11 text-right text-ios-body text-ios-secondary-label tabular-nums"
            >
              {quality}%
            </Text>
          </li>
        ) : null}
      </IosListSection>
      <IosListSection className="px-0">
        <li>
          <button
            type="button"
            disabled={!canRemoveRestrictions}
            className="flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-ios-body text-ios-tint transition-colors duration-150 outline-none select-none focus-visible:bg-ios-fill active:bg-ios-grouped-cell-pressed disabled:text-ios-tertiary-label motion-reduce:transition-none [&_svg]:size-5"
            onClick={onRemoveRestrictions}
          >
            <LockIcon />
            {labels.removeLock}
          </button>
        </li>
      </IosListSection>
    </>
  );
}
