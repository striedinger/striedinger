import type { OnDeviceAiLabels } from "../../components/ios/ios-intelligence-card";

type OnDeviceAiMessage =
  | "Downloading the on-device model… {percent}"
  | "This couldn’t be completed on this device. Try again."
  | "Created on this device. Results may contain mistakes."
  | "Working on this device…";

/** The shared on-device AI strings, from any route's translator. */
export function getOnDeviceAiLabels(
  translate: (message: OnDeviceAiMessage) => string,
): OnDeviceAiLabels {
  return {
    downloading: translate("Downloading the on-device model… {percent}"),
    failed: translate("This couldn’t be completed on this device. Try again."),
    onDevice: translate("Created on this device. Results may contain mistakes."),
    working: translate("Working on this device…"),
  };
}
