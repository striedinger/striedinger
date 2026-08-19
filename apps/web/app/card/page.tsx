import type { Metadata } from "next";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Text } from "@workspace/ui/components/text";
import { Suspense } from "react";

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
    <PageShell>
      <PageContainer>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-12">
          <PageHeader
            title="Link Card Maker"
            description="Share a link that looks like a different website. The card shows that site's own title and image."
          />

          <form method="get" className="flex flex-col gap-4">
            <label htmlFor="card-url" className="flex flex-col gap-2">
              <Text as="span" size="sm" weight="medium">
                Website to show
              </Text>
              <Input
                id="card-url"
                name="url"
                type="url"
                required
                defaultValue={targetUrl}
                placeholder="https://example.com/article"
              />
            </label>
            <Button type="submit" className="self-start">
              Create link
            </Button>
          </form>

          <Suspense fallback={null}>
            <CardResult targetUrl={targetUrl} />
          </Suspense>
        </div>
      </PageContainer>
    </PageShell>
  );
}
