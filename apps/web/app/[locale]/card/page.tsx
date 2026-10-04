import type { Metadata } from "next";

import { LinkIcon } from "@workspace/icons/link-icon";
import { Text } from "@workspace/ui/components/text";
import Form from "next/form";
import { Suspense } from "react";

import { IosSubmitButton } from "../../../components/ios/ios-submit-button";
import { createCardMetadata, getCardParams, resolveCardPreview } from "./card-preview";
import { CardResult } from "./card-result";

interface CardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: CardPageProps): Promise<Metadata> {
  const { targetUrl } = getCardParams(await searchParams);
  const preview = await resolveCardPreview(targetUrl);
  return createCardMetadata(preview);
}

export default async function CardPage({ searchParams }: CardPageProps) {
  const { targetUrl } = getCardParams(await searchParams);

  return (
    <>
      <Form action="/card" className="flex flex-col gap-5">
        <Text as="label" htmlFor="card-url" className="sr-only">
          Website
        </Text>
        <div className="flex min-h-[52px] items-center gap-3 rounded-ios-xl bg-ios-grouped-cell px-4 transition-shadow duration-150 focus-within:ring-2 focus-within:ring-ios-tint/35 motion-reduce:transition-none">
          <LinkIcon aria-hidden="true" className="size-5 shrink-0 text-ios-tertiary-label" />
          <input
            id="card-url"
            name="url"
            type="url"
            inputMode="url"
            enterKeyHint="go"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            maxLength={2048}
            defaultValue={targetUrl}
            placeholder="https://example.com/article"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-ios-body text-ios-label caret-ios-tint outline-none placeholder:text-ios-tertiary-label"
          />
        </div>
        <IosSubmitButton label="Create link" checkingLabel="Creating…" />
      </Form>

      <Suspense key={targetUrl} fallback={null}>
        <CardResult targetUrl={targetUrl} />
      </Suspense>
    </>
  );
}
