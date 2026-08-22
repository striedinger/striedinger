import { Input } from "@workspace/ui/components/input";
import { Text } from "@workspace/ui/components/text";
import Form from "next/form";

import type { OgPreviewLabels } from "../../lib/og/labels";
import type { PreviewState } from "../../lib/og/types";

import { SocialCardPreview } from "../../components/social-card-preview";
import { MetadataTable } from "./metadata-table";
import { OgSubmitButton } from "./og-submit-button";

interface OgPreviewFormProps {
  initialState: PreviewState;
  labels: OgPreviewLabels;
}

export function OgPreviewForm({ initialState, labels }: OgPreviewFormProps) {
  return (
    <div className="flex flex-col gap-16">
      <Form action="/og" className="flex flex-col gap-4" replace scroll={false}>
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
            defaultValue={initialState.url}
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
          {initialState.status === "error" ? (
            <Text size="sm" tone="destructive">
              {labels.errors[initialState.error]}
            </Text>
          ) : null}
        </div>
      </Form>

      <div className="flex flex-col gap-12" aria-label={labels.previewRegion}>
        {initialState.status === "success" ? (
          <>
            <Text size="sm" tone="muted">
              {labels.previewing
                .replace("{url}", initialState.url)
                .replace("{duration}", String(initialState.durationMilliseconds))}
            </Text>
            <SocialCardPreview
              metadata={initialState.metadata}
              platform="twitter"
              title={labels.twitter}
            />
            <SocialCardPreview
              metadata={initialState.metadata}
              platform="open-graph"
              title={labels.openGraph}
            />
            <MetadataTable
              heading={labels.metadata}
              description={labels.metadataDescription}
              tags={initialState.metadata.tags}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
