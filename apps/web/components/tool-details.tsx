import { Text } from "@workspace/ui/components/text";

interface ToolDetailSection {
  description: string;
  items?: readonly string[];
  title: string;
}

interface ToolDetailsProps {
  description: string;
  sections: readonly ToolDetailSection[];
  title: string;
}

export function ToolDetails({ description, sections, title }: ToolDetailsProps) {
  return (
    <section
      className="flex flex-col gap-8 border-t border-border/70 pt-12"
      aria-labelledby="tool-details-heading"
    >
      <div className="flex max-w-3xl flex-col gap-3">
        <Text as="h2" id="tool-details-heading" size="2xl" weight="semibold">
          {title}
        </Text>
        <Text tone="muted" className="leading-relaxed">
          {description}
        </Text>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {sections.map(function renderSection(section) {
          return (
            <article
              key={section.title}
              className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/60 p-5"
            >
              <Text as="h3" size="lg" weight="semibold">
                {section.title}
              </Text>
              <Text tone="muted" className="leading-relaxed">
                {section.description}
              </Text>
              {section.items ? (
                <ul className="flex list-disc flex-col gap-2 pl-5 text-muted-foreground">
                  {section.items.map(function renderItem(item) {
                    return (
                      <Text as="li" key={item} size="sm" className="leading-relaxed">
                        {item}
                      </Text>
                    );
                  })}
                </ul>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export type { ToolDetailsProps };
