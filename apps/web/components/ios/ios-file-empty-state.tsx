import type { ReactNode } from "react";

import { Text } from "@workspace/ui/components/text";

import { IosContentUnavailable } from "./ios-content-unavailable";

interface IosFileEmptyStateProps {
  description: string;
  icon: ReactNode;
  /** Shown under the drop target, such as a note that files never leave the device. */
  note: string;
  title: string;
}

/** The dashed drop target a local file tool shows before a file is chosen. */
export function IosFileEmptyState({ description, icon, note, title }: IosFileEmptyStateProps) {
  return (
    <div className="flex flex-col pt-2">
      <div className="rounded-ios-2xl border-2 border-dashed border-ios-separator bg-ios-grouped-cell">
        <IosContentUnavailable
          className="px-6 pt-12 pb-12"
          icon={icon}
          title={title}
          description={description}
        />
      </div>
      <Text className="px-5 pt-2 text-ios-footnote text-ios-secondary-label">{note}</Text>
    </div>
  );
}
