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
        className="text-ios-subheadline text-ios-secondary-label px-5 pt-4 pb-1.5 font-semibold"
      >
        {heading}
      </Text>
      <dl className="bg-ios-grouped-cell overflow-hidden rounded-[22px]">
        {tags.map(function renderMetadataTag(tag, index) {
          return (
            <div
              className="not-last:after:bg-ios-separator relative flex flex-col gap-0.5 px-4 py-3 not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-4 not-last:after:h-px not-last:after:scale-y-50 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4"
              key={`${tag.name}-${index}`}
            >
              <Text
                as="dt"
                family="mono"
                className="text-ios-secondary-label min-w-0 text-[13px] leading-[22px] break-all"
              >
                {tag.name}
              </Text>
              <Text
                as="dd"
                className="text-ios-label min-w-0 text-[15px] leading-[22px] tracking-[-0.23px] break-words"
              >
                {tag.value}
              </Text>
            </div>
          );
        })}
      </dl>
      <Text className="text-ios-footnote text-ios-secondary-label px-5 pt-2">{description}</Text>
    </section>
  );
}
