import type { ComponentPropsWithRef } from "react";

import { cn } from "@workspace/ui/lib/utils";

type PageShellProps = ComponentPropsWithRef<"main">;

function PageShell({ className, ...props }: PageShellProps) {
  return (
    <main
      data-slot="page-shell"
      className={cn(
        "min-h-[calc(100svh-3.5rem)] bg-background px-4 py-10 font-serif text-foreground sm:px-6 sm:py-16",
        className,
      )}
      {...props}
    />
  );
}

export { PageShell };
export type { PageShellProps };
