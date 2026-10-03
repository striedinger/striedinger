"use client";

import { CloseIcon } from "@workspace/icons/close-icon";
import { UsersIcon } from "@workspace/icons/users-icon";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Text } from "@workspace/ui/components/text";

import { PairingPanel, type PairingPanelProps } from "./pairing-panel";

type DeviceDrawerProps = PairingPanelProps;

export function DeviceDrawer({ labels, peerCount, ...pairingProps }: DeviceDrawerProps) {
  const deviceLabel =
    peerCount === 0
      ? labels.connect
      : peerCount === 1
        ? labels.oneDevice
        : labels.deviceCount.replace("{count}", String(peerCount));

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant={peerCount === 0 ? "default" : "outline"}
            className="h-11 rounded-xl px-3 sm:px-4"
          />
        }
      >
        <UsersIcon />
        {deviceLabel}
      </SheetTrigger>
      <SheetContent className="flex w-[min(25rem,94vw)] flex-col gap-5 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <SheetTitle render={<Text as="h2" size="xl" weight="semibold" />}>
              {labels.nearbyDevices}
            </SheetTitle>
            <SheetDescription render={<Text size="sm" tone="muted" />}>
              {labels.connectToJoin}
            </SheetDescription>
          </div>
          <SheetClose
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-11 rounded-xl"
                aria-label={labels.closeDevices}
              />
            }
          >
            <CloseIcon />
          </SheetClose>
        </div>
        <PairingPanel labels={labels} peerCount={peerCount} {...pairingProps} />
      </SheetContent>
    </Sheet>
  );
}
