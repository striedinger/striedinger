"use client";

import { Drawer } from "@base-ui/react/drawer";
import { CloseIcon } from "@workspace/icons/close-icon";

import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { useIosPortalContainer } from "../../../components/ios/ios-portal-container";
import { useOpenAfterMount } from "../../../components/use-open-after-mount";
import { PairingPanel, type PairingPanelProps } from "./pairing-panel";

interface DeviceDrawerProps extends PairingPanelProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/** The bottom sheet for pairing more devices once a conversation has started. */
export function DeviceDrawer({ onOpenChange, open, ...pairingProps }: DeviceDrawerProps) {
  const portalContainer = useIosPortalContainer();
  const isOpen = useOpenAfterMount(open);
  const { labels } = pairingProps;

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={function changeOpen(nextOpen) {
        onOpenChange(nextOpen);
      }}
    >
      <Drawer.Portal container={portalContainer}>
        <Drawer.Backdrop className="fixed inset-0 z-50 bg-black opacity-[calc(0.25*(1-var(--drawer-swipe-progress)))] transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0 motion-reduce:transition-none" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
          <Drawer.Popup className="mb-[var(--keyboard-inset,0px)] flex max-h-[calc(85dvh-var(--keyboard-inset,0px))] w-full max-w-xl [transform:translateY(var(--drawer-swipe-movement-y))] flex-col overflow-hidden rounded-t-[38px] bg-(--ios-grouped-background) pb-[max(calc(env(safe-area-inset-bottom)-var(--keyboard-inset,0px)),0px)] text-(--ios-label) shadow-[0_-4px_30px_rgb(0_0_0/0.12)] transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)] data-swiping:select-none motion-reduce:transition-none">
            <div
              aria-hidden="true"
              className="mx-auto mt-1.5 h-[5px] w-9 shrink-0 rounded-full bg-(--ios-tertiary-label)"
            />
            <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pt-1 pb-1">
              <Drawer.Close
                render={
                  <IosBarButton aria-label={labels.closeDevices} className="justify-self-start" />
                }
              >
                <CloseIcon strokeWidth={2.4} />
              </Drawer.Close>
              <Drawer.Title className="text-[17px] leading-[22px] font-semibold tracking-[-0.43px]">
                {labels.nearbyDevices}
              </Drawer.Title>
              <span />
            </div>
            <Drawer.Description className="shrink-0 px-8 pb-1 text-center text-[13px] leading-[18px] tracking-[-0.08px] text-(--ios-secondary-label)">
              {labels.connectToJoin}
            </Drawer.Description>
            <Drawer.Content className="overflow-y-auto overscroll-contain px-4 pt-4 pb-6">
              <PairingPanel {...pairingProps} />
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
