import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Suspense } from "react";

import { CardForm } from "./card-form";
import { createCardMetadata, getCardParams, resolveCardPreview } from "./card-preview";
import { CardResult } from "./card-result";

interface CardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: CardPageProps): Promise<Metadata> {
  const { image, targetUrl, title } = getCardParams(await searchParams);
  const preview = await resolveCardPreview(targetUrl, title, image);
  return createCardMetadata(preview);
}

export default async function CardPage({ searchParams }: CardPageProps) {
  const { image, targetUrl, title } = getCardParams(await searchParams);

  return (
    <PageShell>
      <PageContainer>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-12">
          <PageHeader
            title="Link Card Maker"
            description="Share a link that looks like a different website. The title and image are copied from that site unless you set your own."
          />

          <CardForm defaultUrl={targetUrl} defaultTitle={title} defaultImage={image} />

          <Suspense fallback={null}>
            <CardResult targetUrl={targetUrl} title={title} image={image} />
          </Suspense>
        </div>
      </PageContainer>
    </PageShell>
  );
}
