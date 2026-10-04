import { Text } from "@workspace/ui/components/text";

import type { MetadataTag } from "../../../lib/og/types";

interface MetadataTableProps {
  description: string;
  heading: string;
  tags: ReadonlyArray<MetadataTag>;
}

/** Every detected tag as an inset grouped list of name and value pairs. */
export function MetadataTable({ description, heading, tags }: MetadataTableProps) {
  return (
    <section className="flex flex-col" aria-labelledby="metadata-heading">
      <Text
        as="h2"
        id="metadata-heading"
        className="px-5 pt-4 pb-1.5 text-ios-subheadline font-semibold text-ios-secondary-label"
      >
        {heading}
      </Text>
      <dl className="overflow-hidden rounded-ios-xl bg-ios-grouped-cell">
        {tags.map(function renderMetadataTag(tag, index) {
          return (
            <div
              className="relative flex flex-col gap-0.5 px-4 py-3 not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-4 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4"
              key={`${tag.name}-${index}`}
            >
              <Text
                as="dt"
                family="mono"
                className="min-w-0 text-ios-footnote leading-[22px] break-all text-ios-secondary-label"
              >
                {tag.name}
              </Text>
              <Text
                as="dd"
                className="min-w-0 text-ios-subheadline leading-[22px] break-words text-ios-label"
              >
                {tag.value}
              </Text>
            </div>
          );
        })}
      </dl>
      <Text className="px-5 pt-2 text-ios-footnote text-ios-secondary-label">{description}</Text>
    </section>
  );
}
