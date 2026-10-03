import { Skeleton } from "@workspace/ui/components/skeleton";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";

interface DiagnosticSectionSkeletonProps {
  rowCount: number;
  title: string;
}

/** A section heading with placeholder rows sized like the details that replace them. */
export function DiagnosticSectionSkeleton({ rowCount, title }: DiagnosticSectionSkeletonProps) {
  return (
    <section className="flex flex-col gap-4">
      <Text as="h2" size="xl" weight="semibold">
        {title}
      </Text>
      <Surface className="overflow-hidden shadow-none" aria-hidden="true">
        <div className="divide-y divide-border/70">
          {Array.from({ length: rowCount }, function renderRow(_, index) {
            return (
              <div key={index} className="grid gap-1 px-4 py-3 sm:grid-cols-[15rem_minmax(0,1fr)]">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            );
          })}
        </div>
      </Surface>
    </section>
  );
}
