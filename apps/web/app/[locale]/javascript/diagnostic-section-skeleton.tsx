import { IosListSection } from "../../../components/ios/ios-list-section";
import { IosSkeleton } from "../../../components/ios/ios-skeleton";

interface DiagnosticSectionSkeletonProps {
  rowCount: number;
  title: string;
}

/** A grouped list with placeholder rows sized like the details that replace them. */
export function DiagnosticSectionSkeleton({ rowCount, title }: DiagnosticSectionSkeletonProps) {
  return (
    <IosListSection className="px-0" header={title}>
      {Array.from({ length: rowCount }, function renderRow(_, index) {
        return (
          <li
            key={index}
            aria-hidden="true"
            className="relative flex min-h-11 items-center justify-between gap-4 px-4 py-2.75 not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-4 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator"
          >
            <IosSkeleton className="h-4 w-36" />
            <IosSkeleton className="h-4 w-20" />
          </li>
        );
      })}
    </IosListSection>
  );
}
