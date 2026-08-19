import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Suspense } from "react";

import { CardForm } from "./card-form";
import { getCardParams, resolveCardPreview } from "./card-preview";
import { CardResult } from "./card-result";

interface CardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: CardPageProps): Promise<Metadata> {
  const { image, targetUrl, title } = getCardParams(await searchParams);
  const preview = await resolveCardPreview(targetUrl, title, image);

  if (preview.status !== "ready") {
    return {
      title: "Link Card Research",
      robots: { follow: false, index: false },
    };
  }

  return {
    title: preview.title,
    description: preview.description || undefined,
    robots: { follow: false, index: false },
    openGraph: {
      title: preview.title,
      description: preview.description || undefined,
      url: preview.targetUrl,
      images: preview.image ? [preview.image] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: preview.title,
      description: preview.description || undefined,
      images: preview.image ? [preview.image] : undefined,
    },
  };
}

export default async function CardPage({ searchParams }: CardPageProps) {
  const { image, targetUrl, title } = getCardParams(await searchParams);

  return (
    <PageShell>
      <PageContainer>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-12">
          <PageHeader
            title="Link Card Research"
            description="Make a link whose share preview shows a different website. The preview copies that website's title and image unless you set your own."
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
