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
        className="mb-2 flex text-ios-secondary-label [&_svg]:size-14 [&_svg]:stroke-[1.6]"
      >
        {icon}
      </span>
      <Text className="text-ios-title2 font-bold text-ios-label">{title}</Text>
      {description ? (
        <Text className="max-w-xs text-ios-subheadline text-ios-secondary-label">
          {description}
        </Text>
      ) : null}
    </div>
  );
}
