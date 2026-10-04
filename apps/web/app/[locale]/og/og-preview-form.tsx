import { LinkIcon } from "@workspace/icons/link-icon";
import { Text } from "@workspace/ui/components/text";
import Form from "next/form";
import { Suspense } from "react";

import type { OgPreviewLabels } from "../../../lib/og/labels";
import type { PreviewState } from "../../../lib/og/types";

import { IosSubmitButton } from "../../../components/ios/ios-submit-button";
import { OgPreviewError } from "./og-preview-error";
import { OgPreviewResults } from "./og-preview-results";
import { OgPreviewResultsSkeleton } from "./og-preview-results-skeleton";

interface OgPreviewFormProps {
  /** The localized page URL the form submits to. */
  action: string;
  defaultUrl: string;
  labels: OgPreviewLabels;
  /** The requested page's metadata, streaming in, or null before anything is requested. */
  preview: Promise<PreviewState> | null;
}

/**
 * The form stays mounted across submissions so focus, typed text, and the pending button
 * survive; only the error and the card previews suspend while a URL is checked.
 */
export function OgPreviewForm({ action, defaultUrl, labels, preview }: OgPreviewFormProps) {
  return (
    <div className="flex flex-col gap-8">
      <Form action={action} className="flex flex-col gap-5" replace scroll={false}>
        <div className="flex flex-col">
          <Text as="label" className="sr-only" htmlFor="preview-url">
            {labels.urlLabel}
          </Text>
          <div className="bg-ios-grouped-cell focus-within:ring-ios-tint/35 flex min-h-[52px] items-center gap-3 rounded-[22px] px-4 transition-shadow duration-150 focus-within:ring-2 motion-reduce:transition-none">
            <LinkIcon aria-hidden="true" className="text-ios-tertiary-label size-5 shrink-0" />
            <input
              className="text-ios-body text-ios-label caret-ios-tint placeholder:text-ios-tertiary-label min-w-0 flex-1 bg-transparent py-3.5 outline-none"
              id="preview-url"
              name="url"
              type="url"
              inputMode="url"
              enterKeyHint="go"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              defaultValue={defaultUrl}
              placeholder={labels.urlPlaceholder}
              required
              maxLength={2048}
              aria-describedby="preview-security preview-error"
            />
          </div>
          <div id="preview-error" aria-live="polite">
            {preview ? (
              <Suspense key={defaultUrl} fallback={null}>
                <OgPreviewError labels={labels} preview={preview} />
              </Suspense>
            ) : null}
          </div>
          <Text
            id="preview-security"
            className="text-ios-footnote text-ios-secondary-label px-5 pt-2"
          >
            {labels.security}
          </Text>
        </div>
        <IosSubmitButton label={labels.button} checkingLabel={labels.checking} />
      </Form>

      <div className="flex flex-col gap-3" aria-label={labels.previewRegion}>
        {preview ? (
          <Suspense key={defaultUrl} fallback={<OgPreviewResultsSkeleton />}>
            <OgPreviewResults labels={labels} preview={preview} />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
