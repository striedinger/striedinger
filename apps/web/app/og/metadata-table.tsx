import { Text } from "@workspace/ui/components/text";
import type { MetadataTag } from "../../lib/og/types";

interface MetadataTableProps {
  description: string;
  heading: string;
  tags: ReadonlyArray<MetadataTag>;
}

export function MetadataTable({ description, heading, tags }: MetadataTableProps) {
  return (
    <section className="flex flex-col gap-6" aria-labelledby="metadata-heading">
      <div className="flex flex-col gap-2">
        <Text
          as="h2"
          id="metadata-heading"
          size="xl"
          weight="semibold"
        >
          {heading}
        </Text>
        <Text size="sm" tone="muted">
          {description}
        </Text>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/70">
        <dl className="divide-y divide-border/70">
          {tags.map(function renderMetadataTag(tag, index) {
            return (
              <div
                className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr]"
                key={`${tag.name}-${index}`}
              >
                <Text as="dt" family="mono" size="xs" tone="muted">
                  {tag.name}
                </Text>
                <Text
                  as="dd"
                  size="sm"
                  className="min-w-0 break-words"
                >
                  {tag.value}
                </Text>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
