import type { ReactNode } from "react";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

interface IosContentUnavailableProps {
  className?: string;
  description?: string;
  icon: ReactNode;
  title: string;
}

/** The centered empty state used across iOS, matching ContentUnavailableView. */
export function IosContentUnavailable({
  className,
  description,
  icon,
  title,
}: IosContentUnavailableProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 px-10 pt-[14vh] pb-10 text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="text-ios-secondary-label mb-2 flex [&_svg]:size-14 [&_svg]:stroke-[1.6]"
      >
        {icon}
      </span>
      <Text className="text-ios-title2 text-ios-label font-bold">{title}</Text>
      {description ? (
        <Text className="text-ios-subheadline text-ios-secondary-label max-w-xs">
          {description}
        </Text>
      ) : null}
    </div>
  );
}
