import { Image } from "@workspace/ui/components/image";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";

import type { PageMetadata } from "../../lib/og/types";

interface SocialCardPreviewProps {
  metadata: PageMetadata;
  platform: "open-graph" | "twitter";
  title: string;
  fromLabel: string;
}

export function SocialCardPreview({
  metadata,
  platform,
  title,
  fromLabel,
}: SocialCardPreviewProps) {
  const cardTitle = platform === "twitter" ? metadata.twitterTitle : metadata.title;
  const cardDescription =
    platform === "twitter" ? metadata.twitterDescription : metadata.description;
  const cardImage = platform === "twitter" ? metadata.twitterImage : metadata.image;
  const sourceHostname = getSourceHostname(metadata.canonicalUrl);

  if (platform === "twitter") {
    return (
      <section
        className="mx-auto flex w-full max-w-[550px] flex-col gap-4"
        aria-labelledby={`${platform}-preview-heading`}
      >
        <Text as="h2" id={`${platform}-preview-heading`} size="xl" weight="semibold">
          {title}
        </Text>
        <article className="relative aspect-[1.91/1] overflow-hidden rounded-xl border border-border/70 bg-muted shadow-sm">
          {cardImage ? (
            <Image
              className="size-full"
              imageClassName="object-cover"
              src={cardImage}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="size-full bg-[radial-gradient(circle_at_top_left,var(--color-accent),var(--color-muted))]" />
          )}
          <div className="absolute inset-x-0 bottom-0 z-10 flex bg-gradient-to-t from-foreground/80 to-transparent px-3 pt-10 pb-3">
            <Text
              as="h3"
              numberOfLines={2}
              size="sm"
              weight="medium"
              className="max-w-full rounded-lg bg-foreground/75 px-2.5 py-1.5 text-background!"
            >
              {cardDescription ? `${cardTitle} - ${cardDescription}` : cardTitle}
            </Text>
          </div>
        </article>
        <Text size="sm" tone="muted">
          {fromLabel}: {sourceHostname}
        </Text>
      </section>
    );
  }

  return (
    <section
      className="mx-auto flex w-full max-w-[550px] flex-col gap-4"
      aria-labelledby={`${platform}-preview-heading`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <Text as="h2" id={`${platform}-preview-heading`} size="xl" weight="semibold">
          {title}
        </Text>
        <Text as="span" size="xs" tone="muted">
          og:type website
        </Text>
      </div>

      <Surface as="article" className="overflow-hidden">
        <div className="aspect-[1.91/1] overflow-hidden bg-muted">
          {cardImage ? (
            <Image
              className="size-full"
              imageClassName="object-cover"
              src={cardImage}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="size-full bg-[radial-gradient(circle_at_top_left,var(--color-accent),var(--color-muted))]" />
          )}
        </div>
        <div className="flex flex-col gap-1.5 p-4">
          <Text size="xs" tone="muted" className="truncate">
            {metadata.siteName}
          </Text>
          <Text as="h3" weight="semibold" className="line-clamp-2 leading-snug">
            {cardTitle}
          </Text>
          {cardDescription ? (
            <Text size="sm" tone="muted" className="line-clamp-2 leading-relaxed">
              {cardDescription}
            </Text>
          ) : null}
        </div>
      </Surface>
    </section>
  );
}

function getSourceHostname(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}
