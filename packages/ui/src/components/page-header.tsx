import type { ReactNode } from "react";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

type PageHeaderVariant = "default" | "compact";

interface PageHeaderProps {
  className?: string;
  description: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  variant?: PageHeaderVariant;
}

function PageHeader({
  className,
  description,
  eyebrow,
  title,
  variant = "default",
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "flex max-w-3xl animate-in flex-col gap-4 duration-500 ease-out fade-in slide-in-from-bottom-2 motion-reduce:animate-none",
        className,
      )}
    >
      {eyebrow}
      <Text
        as="h1"
        size={variant === "compact" ? "3xl" : "4xl"}
        weight="semibold"
        className="tracking-tight sm:text-5xl sm:leading-none"
      >
        {title}
      </Text>
      <Text
        size="lg"
        tone="muted"
        className={cn(
          "max-w-2xl leading-relaxed",
          variant === "compact" ? "sr-only sm:not-sr-only" : undefined,
        )}
      >
        {description}
      </Text>
    </header>
  );
}

export { PageHeader };
export type { PageHeaderProps, PageHeaderVariant };
