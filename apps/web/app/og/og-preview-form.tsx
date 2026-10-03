import { Input } from "@workspace/ui/components/input";
import { Text } from "@workspace/ui/components/text";
import Form from "next/form";
import { Suspense } from "react";

import type { OgPreviewLabels } from "../../lib/og/labels";
import type { PreviewState } from "../../lib/og/types";

import { OgPreviewError } from "./og-preview-error";
import { OgPreviewResults } from "./og-preview-results";
import { OgPreviewResultsSkeleton } from "./og-preview-results-skeleton";
import { OgSubmitButton } from "./og-submit-button";

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
    <div className="flex flex-col gap-16">
      <Form action={action} className="flex flex-col gap-4" replace scroll={false}>
        <Text as="label" className="sr-only" htmlFor="preview-url">
          {labels.urlLabel}
        </Text>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className="h-11 rounded-xl px-4 text-base shadow-sm"
            id="preview-url"
            name="url"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            defaultValue={defaultUrl}
            placeholder={labels.urlPlaceholder}
            required
            maxLength={2048}
            aria-describedby="preview-security preview-error"
          />
          <OgSubmitButton label={labels.button} checkingLabel={labels.checking} />
        </div>
        <Text id="preview-security" size="xs" tone="muted" className="leading-relaxed">
          {labels.security}
        </Text>
        <div id="preview-error" aria-live="polite">
          {preview ? (
            <Suspense key={defaultUrl} fallback={null}>
              <OgPreviewError labels={labels} preview={preview} />
            </Suspense>
          ) : null}
        </div>
      </Form>

      <div className="flex flex-col gap-12" aria-label={labels.previewRegion}>
        {preview ? (
          <Suspense key={defaultUrl} fallback={<OgPreviewResultsSkeleton />}>
            <OgPreviewResults labels={labels} preview={preview} />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
