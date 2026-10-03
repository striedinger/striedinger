"use client";

import type { ReactElement, ReactNode } from "react";

import { Menu } from "@base-ui/react/menu";
import { CheckIcon } from "@workspace/icons/check-icon";
import { cn } from "@workspace/ui/lib/utils";

import { useIosPortalContainer } from "./ios-portal-container";

export interface IosMenuAction {
  checked?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  label: string;
  onSelect: () => void;
}

export interface IosMenuSection {
  actions: readonly IosMenuAction[];
  id: string;
  title?: string;
}

interface IosMenuProps {
  align?: "start" | "center" | "end";
  sections: readonly IosMenuSection[];
  side?: "top" | "bottom";
  trigger: ReactElement;
}

export function IosMenu({ align = "end", sections, side = "bottom", trigger }: IosMenuProps) {
  const portalContainer = useIosPortalContainer();
  const visibleSections = sections.filter(function hasActions(section) {
    return section.actions.length > 0;
  });
  const hasCheckableActions = visibleSections.some(function containsCheckable(section) {
    return section.actions.some(function isCheckable(action) {
      return action.checked !== undefined;
    });
  });

  return (
    <Menu.Root>
      <Menu.Trigger render={trigger} />
      <Menu.Portal container={portalContainer}>
        <Menu.Positioner
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className="z-50 outline-none"
        >
          <Menu.Popup className="max-h-(--available-height) w-[250px] origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-[13px] bg-(--ios-menu) [font-family:inherit] text-(--ios-label) shadow-[0_10px_40px_rgb(0_0_0/0.2)] backdrop-blur-2xl backdrop-saturate-180 transition-[scale,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:scale-[0.85] data-ending-style:opacity-0 data-starting-style:scale-[0.6] data-starting-style:opacity-0 motion-reduce:transition-none">
            {visibleSections.map(function renderSection(section, sectionIndex) {
              return (
                <Menu.Group
                  key={section.id}
                  className={cn(
                    sectionIndex > 0 &&
                      "border-t-[8px] border-(--ios-fill)/60 dark:border-black/40",
                  )}
                >
                  {section.title ? (
                    <Menu.GroupLabel className="px-4 pt-2 pb-1.5 text-[13px] leading-[18px] text-(--ios-secondary-label)">
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
                          "relative flex min-h-11 cursor-default items-center gap-3 py-[11px] pr-4 text-[17px] leading-[22px] tracking-[-0.43px] outline-none select-none not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-0 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-(--ios-separator) data-disabled:text-(--ios-tertiary-label) data-highlighted:bg-(--ios-fill) [&_svg]:size-5 [&_svg]:shrink-0",
                          hasCheckableActions ? "pl-10" : "pl-4",
                          action.destructive && "text-(--ios-red)",
                        )}
                      >
                        {action.checked ? (
                          <CheckIcon
                            className="absolute left-3.5 !size-4 text-(--ios-label)"
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
