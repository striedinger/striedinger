import type { ChatLabels } from "./types";

/** Describes how many devices are in the chat, such as “1 device connected”. */
export function describeConnectedDevices(labels: ChatLabels, peerCount: number) {
  if (peerCount === 0) return labels.readyToConnect;
  if (peerCount === 1) return labels.oneDeviceConnected;
  return labels.devicesConnected.replace("{count}", String(peerCount));
}
