import { BubbleIcon } from "@workspace/icons/bubble-icon";
import { LockIcon } from "@workspace/icons/lock-icon";
import { Text } from "@workspace/ui/components/text";

import type { ChatLabels } from "./types";

interface ChatWelcomeProps {
  alias: string;
  labels: ChatLabels;
}

/** Introduces this device's temporary alias before any other device has joined. */
export function ChatWelcome({ alias, labels }: ChatWelcomeProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 pt-2 text-center">
      <span
        aria-hidden="true"
        className="bg-ios-tint flex size-[72px] items-center justify-center rounded-full text-white"
      >
        <BubbleIcon className="size-9" fill="currentColor" strokeWidth={1.5} />
      </span>
      <Text className="text-ios-title2 text-ios-label font-bold">
        {labels.youAre.replace("{name}", alias)}
      </Text>
      <Text className="text-ios-subheadline text-ios-secondary-label max-w-sm">
        {labels.privacyIntro}
      </Text>
      <Text
        as="span"
        className="text-ios-footnote text-ios-green inline-flex items-center gap-1.5 font-semibold"
      >
        <LockIcon className="size-3.5" />
        {labels.localOnly}
      </Text>
    </div>
  );
}
