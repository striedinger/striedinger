"use client";

import { IosSheet } from "../../../components/ios/ios-sheet";
import { PairingPanel, type PairingPanelProps } from "./pairing-panel";

interface DeviceDrawerProps extends PairingPanelProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/** The bottom sheet for pairing more devices once a conversation has started. */
export function DeviceDrawer({ onOpenChange, open, ...pairingProps }: DeviceDrawerProps) {
  const { labels } = pairingProps;

  return (
    <IosSheet
      open={open}
      onOpenChange={onOpenChange}
      title={labels.nearbyDevices}
      closeLabel={labels.closeDevices}
      description={labels.connectToJoin}
      contentClassName="px-4 pt-4 pb-6"
      followsKeyboard
    >
      <PairingPanel {...pairingProps} />
    </IosSheet>
  );
}
