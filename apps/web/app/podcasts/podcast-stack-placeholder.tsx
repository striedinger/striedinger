import { Text } from "@workspace/ui/components/text";

import { IosNavigationBar } from "../../components/ios/ios-navigation-bar";

interface PodcastStackPlaceholderProps {
  message: string;
  title: string;
}

/** A pushed screen whose show details are still loading or could not be found. */
export function PodcastStackPlaceholder({ message, title }: PodcastStackPlaceholderProps) {
  return (
    <div data-ios-scroll className="flex h-full flex-col overflow-y-auto">
      <IosNavigationBar title={title} titleDisplay="hidden" />
      <Text className="px-8 pt-[20vh] text-center text-[17px] text-(--ios-secondary-label)">
        {message}
      </Text>
    </div>
  );
}
