"use client";

import type { RefObject } from "react";

import { Menu } from "@base-ui/react/menu";
import { CheckIcon } from "@workspace/icons/check-icon";
import { cn } from "@workspace/ui/lib/utils";

import type { IosMenuSection, IosMenuVirtualAnchor } from "./ios-menu-types";

import { useOpenAfterMount } from "../use-open-after-mount";
import { iosStrongGlassClassName } from "./ios-glass";
import { useIosPortalContainer } from "./ios-portal-container";

interface IosMenuPopupProps {
  align: "start" | "center" | "end";
  anchor: RefObject<HTMLElement | null> | IosMenuVirtualAnchor | null;
  finalFocus: RefObject<HTMLElement | null> | false;
  onOpenChange: (open: boolean, timeStamp: number) => void;
  open: boolean;
  sections: readonly IosMenuSection[];
  side: "top" | "bottom";
}

/**
 * The menu surface. It is loaded on demand, so the positioning and focus-management library
 * only downloads once someone opens a menu.
 */
export function IosMenuPopup({
  align,
  anchor,
  finalFocus,
  onOpenChange,
  open,
  sections,
  side,
}: IosMenuPopupProps) {
  const portalContainer = useIosPortalContainer();
  const isOpen = useOpenAfterMount(open);
  const visibleSections = sections.filter(function hasActions(section) {
    return section.actions.length > 0;
  });
  const hasCheckableActions = visibleSections.some(function containsCheckable(section) {
    return section.actions.some(function isCheckable(action) {
      return action.checked !== undefined;
    });
  });

  return (
    <Menu.Root
      open={isOpen}
      onOpenChange={function updateOpen(nextOpen, eventDetails) {
        onOpenChange(nextOpen, eventDetails.event?.timeStamp ?? 0);
      }}
    >
      <Menu.Portal container={portalContainer}>
        <Menu.Positioner
          anchor={anchor}
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className="z-50 outline-none"
        >
          <Menu.Popup
            finalFocus={finalFocus}
            className={cn(
              "max-h-(--available-height) w-[260px] origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-[26px] py-1.5 text-(--ios-label) transition-[scale,opacity,filter] duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)] outline-none data-ending-style:scale-[0.8] data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:scale-[0.5] data-starting-style:opacity-0 data-starting-style:blur-[6px] motion-reduce:transition-none",
              iosStrongGlassClassName,
            )}
          >
            {visibleSections.map(function renderSection(section, sectionIndex) {
              return (
                <Menu.Group
                  key={section.id}
                  className={cn(
                    sectionIndex > 0 &&
                      "relative mt-1.5 pt-1.5 before:absolute before:inset-x-4 before:top-0 before:h-px before:scale-y-50 before:bg-(--ios-separator)",
                  )}
                >
                  {section.title ? (
                    <Menu.GroupLabel className="px-5 pt-1.5 pb-1 text-[13px] leading-[18px] font-medium text-(--ios-secondary-label)">
                      {section.title}
                    </Menu.GroupLabel>
                  ) : null}
                  {section.actions.map(function renderAction(action) {
                    return (
                      <Menu.Item
                        key={action.id}
                        disabled={action.disabled}
                        onClick={action.onSelect}
                        className={cn(
                          "relative mx-1.5 flex min-h-11 cursor-default items-center gap-3 rounded-[16px] py-[11px] pr-3.5 text-[17px] leading-[22px] tracking-[-0.43px] outline-none select-none data-disabled:text-(--ios-tertiary-label) data-highlighted:bg-(--ios-glass-lens) [&_svg]:size-5 [&_svg]:shrink-0",
                          hasCheckableActions ? "pl-10" : "pl-3.5",
                          action.destructive && "text-(--ios-red)",
                        )}
                      >
                        {action.checked ? (
                          <CheckIcon
                            className="absolute left-3 !size-4 text-(--ios-label)"
                            strokeWidth={3}
                          />
                        ) : null}
                        <span className="min-w-0 flex-1">{action.label}</span>
                        {action.icon}
                      </Menu.Item>
                    );
                  })}
                </Menu.Group>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
