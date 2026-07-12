"use client";

import { Input } from "@workspace/ui/components/input";
import { Text } from "@workspace/ui/components/text";
import { useActionState, useState, type ChangeEvent, type FormEvent } from "react";

import type { OgPreviewLabels } from "../../lib/og/labels";
import type { PreviewState } from "../../lib/og/types";

import { previewMetadata } from "./actions";
import { MetadataTable } from "./metadata-table";
import { normalizePreviewUrl } from "./normalize-preview-url";
import { OgSubmitButton } from "./og-submit-button";
import { SocialCardPreview } from "./social-card-preview";

interface OgPreviewFormProps {
  initialState: PreviewState;
  labels: OgPreviewLabels;
}

export function OgPreviewForm({ initialState, labels }: OgPreviewFormProps) {
  const [state, formAction, pending] = useActionState(previewMetadata, initialState, "/og");
  const [url, setUrl] = useState(initialState.url);
  const isAlreadyPreviewed =
    state.status === "success" && normalizePreviewUrl(state.url) === normalizePreviewUrl(url);

  function handleUrlChange(event: ChangeEvent<HTMLInputElement>) {
    const nextUrl = event.currentTarget.value;
    const browserUrl = new URL(window.location.href);

    setUrl(nextUrl);

    if (nextUrl) {
      browserUrl.searchParams.set("url", nextUrl);
    } else {
      browserUrl.searchParams.delete("url");
    }

    window.history.replaceState(
      window.history.state,
      "",
      `${browserUrl.pathname}${browserUrl.search}${browserUrl.hash}`,
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isAlreadyPreviewed) {
      event.preventDefault();
    }
  }

  return (
    <div className="flex flex-col gap-16">
      <form action={formAction} className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
            value={url}
            onChange={handleUrlChange}
            placeholder={labels.urlPlaceholder}
            required
            maxLength={2048}
            aria-describedby="preview-security preview-error"
          />
          <OgSubmitButton
            label={labels.button}
            checkingLabel={labels.checking}
            disabled={isAlreadyPreviewed}
          />
        </div>
        <Text id="preview-security" size="xs" tone="muted" className="leading-relaxed">
          {labels.security}
        </Text>
        <div id="preview-error" aria-live="polite">
          {state.status === "error" ? (
            <Text size="sm" tone="destructive">
              {labels.errors[state.error]}
            </Text>
          ) : null}
        </div>
      </form>

      <div
        className="flex flex-col gap-12 transition-opacity duration-200"
        aria-busy={pending}
        aria-label={labels.previewRegion}
      >
        {state.status === "success" ? (
          <>
            <Text size="sm" tone="muted">
              {labels.previewing
                .replace("{url}", state.url)
                .replace("{duration}", String(state.durationMilliseconds))}
            </Text>
            <SocialCardPreview
              metadata={state.metadata}
              platform="twitter"
              title={labels.twitter}
              fromLabel={labels.from}
            />
            <SocialCardPreview
              metadata={state.metadata}
              platform="open-graph"
              title={labels.openGraph}
              fromLabel={labels.from}
            />
            <MetadataTable
              heading={labels.metadata}
              description={labels.metadataDescription}
              tags={state.metadata.tags}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
