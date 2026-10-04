import { Text } from "@workspace/ui/components/text";

import { IosListSection } from "../../../components/ios/ios-list-section";
import { IosSkeleton } from "../../../components/ios/ios-skeleton";

interface RequestDiagnosticsSkeletonProps {
  labels: {
    headersHeading: string;
    loading: string;
    locationHeading: string;
    observedIpAddress: string;
    requestHeading: string;
  };
}

/** Grouped lists of placeholder rows shaped like the request details that replace them. */
export function RequestDiagnosticsSkeleton({ labels }: RequestDiagnosticsSkeletonProps) {
  const placeholderSections = [
    { title: labels.locationHeading, rowCount: 6 },
    { title: labels.requestHeading, rowCount: 3 },
    { title: labels.headersHeading, rowCount: 8 },
  ];

  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <Text role="status" className="sr-only">
        {labels.loading}
      </Text>
      <IosListSection className="px-0" header={labels.observedIpAddress}>
        <li
          aria-hidden="true"
          className="relative flex justify-center px-4 py-4 after:absolute after:right-0 after:bottom-0 after:left-4 after:h-px after:scale-y-50 after:bg-(--ios-separator)"
        >
          <IosSkeleton className="h-7 w-48" />
        </li>
        {renderPlaceholderRows(2)}
      </IosListSection>
      {placeholderSections.map(function renderPlaceholderSection(section) {
        return (
          <IosListSection key={section.title} className="px-0" header={section.title}>
            {renderPlaceholderRows(section.rowCount)}
          </IosListSection>
        );
      })}
    </div>
  );
}

function renderPlaceholderRows(rowCount: number) {
  return Array.from({ length: rowCount }, function renderPlaceholderRow(_, index) {
    return (
      <li
        key={index}
        aria-hidden="true"
        className="relative flex min-h-[44px] items-center justify-between gap-4 px-4 py-[11px] not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-4 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-(--ios-separator)"
      >
        <IosSkeleton className="h-4 w-24" />
        <IosSkeleton className="h-4 w-32" />
      </li>
    );
  });
}
