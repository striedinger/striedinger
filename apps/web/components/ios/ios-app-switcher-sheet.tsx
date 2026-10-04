"use client";

import type { ReactNode } from "react";

import { Drawer } from "@base-ui/react/drawer";
import { AirdropIcon } from "@workspace/icons/airdrop-icon";
import { BracesIcon } from "@workspace/icons/braces-icon";
import { BubbleIcon } from "@workspace/icons/bubble-icon";
import { ChartLineIcon } from "@workspace/icons/chart-line-icon";
import { ChevronRightIcon } from "@workspace/icons/chevron-right-icon";
import { CloseIcon } from "@workspace/icons/close-icon";
import { CodeIcon } from "@workspace/icons/code-icon";
import { DocIcon } from "@workspace/icons/doc-icon";
import { GlobeIcon } from "@workspace/icons/globe-icon";
import { HouseFillIcon } from "@workspace/icons/house-fill-icon";
import { LinkIcon } from "@workspace/icons/link-icon";
import { NoteTextIcon } from "@workspace/icons/note-text-icon";
import { NumberGridIcon } from "@workspace/icons/number-grid-icon";
import { PhotoIcon } from "@workspace/icons/photo-icon";
import { PodcastIcon } from "@workspace/icons/podcast-icon";
import { TramIcon } from "@workspace/icons/tram-icon";
import Link from "next/link";

import type { IosAppSwitcherLabels } from "./ios-app-switcher-context";

import { useOpenAfterMount } from "../use-open-after-mount";
import { IosAppIcon } from "./ios-app-icon";
import { IosBarButton } from "./ios-bar-button";
import { useIosPortalContainer } from "./ios-portal-container";

interface IosAppSwitcherSheetProps {
  currentHref: string;
  labels: IosAppSwitcherLabels;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

interface SwitcherDestination {
  background: string;
  href: string;
  icon: ReactNode;
  label: keyof IosAppSwitcherLabels | null;
  /** The name to show when it is a brand that stays the same in every language. */
  name?: string;
}

const apps: readonly SwitcherDestination[] = [
  {
    background: "bg-linear-to-b from-[#ffd95a] to-[#ffb300]",
    href: "/notes",
    icon: <NoteTextIcon />,
    label: "notes",
  },
  {
    background: "bg-linear-to-b from-[#d57cff] to-[#8b2be2]",
    href: "/podcasts",
    icon: <PodcastIcon />,
    label: "podcasts",
  },
  {
    background: "bg-linear-to-b from-[#5ab8ff] to-[#0a6cff]",
    href: "/drop",
    icon: <AirdropIcon />,
    label: null,
    name: "Drop",
  },
  {
    background: "bg-linear-to-b from-[#8a8aff] to-[#4f46e5]",
    href: "/sudoku",
    icon: <NumberGridIcon />,
    label: "sudoku",
  },
  {
    background: "bg-linear-to-b from-[#2f68e0] to-[#0039a6]",
    href: "/mta",
    icon: <TramIcon />,
    label: "trains",
  },
  {
    background: "bg-linear-to-b from-[#3a3a3c] to-[#000000]",
    href: "/stocks",
    icon: <ChartLineIcon />,
    label: "stocks",
  },
];

const tools: readonly SwitcherDestination[] = [
  { background: "bg-[#34c759]", href: "/chat", icon: <BubbleIcon />, label: "chat" },
  { background: "bg-[#5856d6]", href: "/og", icon: <LinkIcon />, label: "og" },
  { background: "bg-[#30b0c7]", href: "/ip", icon: <GlobeIcon />, label: "ip" },
  { background: "bg-[#ff9500]", href: "/javascript", icon: <CodeIcon />, label: "javascript" },
  { background: "bg-[#8e8e93]", href: "/json", icon: <BracesIcon />, label: "json" },
  { background: "bg-[#ff2d55]", href: "/image", icon: <PhotoIcon />, label: "image" },
  { background: "bg-[#ff3b30]", href: "/pdf", icon: <DocIcon />, label: "pdf" },
];

const home: SwitcherDestination = {
  background: "bg-[#007aff]",
  href: "/",
  icon: <HouseFillIcon />,
  label: "home",
};

const rowClassName =
  "relative not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-[57px] not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator";

const rowLinkClassName =
  "flex min-h-11 items-center gap-4 py-[7px] pr-4 pl-4 text-ios-body text-ios-label outline-none select-none focus-visible:bg-ios-fill active:bg-ios-grouped-cell-pressed aria-current:font-semibold";

const sectionHeaderClassName =
  "px-4 pb-2 text-[20px] leading-[25px] font-bold tracking-[-0.45px] text-ios-label";

/**
 * A floating iOS 26 sheet that links to every app and tool: the native apps as home screen
 * icons, and the browser tools as a Settings-style list.
 */
export function IosAppSwitcherSheet({
  currentHref,
  labels,
  onOpenChange,
  open,
}: IosAppSwitcherSheetProps) {
  const portalContainer = useIosPortalContainer();
  const isOpen = useOpenAfterMount(open);

  function getName(destination: SwitcherDestination) {
    return destination.label ? labels[destination.label] : (destination.name ?? "");
  }

  function close() {
    onOpenChange(false);
  }

  function renderRow(destination: SwitcherDestination) {
    return (
      <li key={destination.href} className={rowClassName}>
        <Link
          href={destination.href}
          aria-current={destination.href === currentHref ? "page" : undefined}
          className={rowLinkClassName}
          onClick={close}
        >
          <IosAppIcon size="settings" backgroundClassName={destination.background}>
            {destination.icon}
          </IosAppIcon>
          <span className="min-w-0 flex-1 truncate">{getName(destination)}</span>
          <ChevronRightIcon
            aria-hidden="true"
            className="text-ios-tertiary-label size-[14px] shrink-0"
            strokeWidth={3}
          />
        </Link>
      </li>
    );
  }

  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Portal container={portalContainer}>
        <Drawer.Backdrop className="fixed inset-0 z-50 bg-black opacity-[calc(0.25*(1-var(--drawer-swipe-progress)))] transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0 motion-reduce:transition-none" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center px-2 pb-[max(env(safe-area-inset-bottom),8px)]">
          <Drawer.Popup className="bg-ios-secondary-background text-ios-label flex max-h-[calc(100dvh-env(safe-area-inset-top)-24px)] w-full max-w-xl [transform:translateY(var(--drawer-swipe-movement-y))] flex-col overflow-hidden rounded-[38px] shadow-[0_10px_50px_rgb(0_0_0/0.22),inset_0_0.5px_0_0.5px_var(--ios-glass-edge)] transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:[transform:translateY(calc(100%+env(safe-area-inset-bottom)+8px))] data-starting-style:[transform:translateY(calc(100%+env(safe-area-inset-bottom)+8px))] data-swiping:select-none motion-reduce:transition-none">
            <div
              aria-hidden="true"
              className="bg-ios-tertiary-label mx-auto mt-1.5 h-[5px] w-9 shrink-0 rounded-full"
            />
            <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pt-1 pb-1">
              <span />
              <Drawer.Title className="text-ios-body font-semibold">
                {labels.navigation}
              </Drawer.Title>
              <Drawer.Close
                render={<IosBarButton aria-label={labels.close} className="justify-self-end" />}
              >
                <CloseIcon strokeWidth={2.4} />
              </Drawer.Close>
            </div>
            <Drawer.Content className="flex flex-col gap-6 overflow-y-auto overscroll-contain px-4 pt-3 pb-5">
              <nav aria-label={labels.navigation} className="flex flex-col gap-6">
                <section aria-labelledby="ios-app-switcher-apps">
                  <h2 id="ios-app-switcher-apps" className={sectionHeaderClassName}>
                    {labels.apps}
                  </h2>
                  <ul className="bg-ios-tertiary-background m-0 grid list-none grid-cols-4 gap-x-2 gap-y-4 rounded-[26px] px-2 py-4 sm:grid-cols-6">
                    {apps.map(function renderApp(app) {
                      const isCurrent = app.href === currentHref;
                      return (
                        <li key={app.href} className="flex justify-center">
                          <Link
                            href={app.href}
                            aria-current={isCurrent ? "page" : undefined}
                            className="group focus-visible:ring-ios-tint/60 flex w-full flex-col items-center gap-1.5 rounded-[16px] outline-none select-none focus-visible:ring-2"
                            onClick={close}
                          >
                            <span className="transition-transform duration-150 group-active:scale-[0.9] motion-reduce:transition-none">
                              <IosAppIcon size="home" backgroundClassName={app.background}>
                                {app.icon}
                              </IosAppIcon>
                            </span>
                            <span className="text-ios-label max-w-full truncate text-[12px] leading-4 tracking-[0] group-aria-current:font-semibold">
                              {getName(app)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
                <section aria-labelledby="ios-app-switcher-tools">
                  <h2 id="ios-app-switcher-tools" className={sectionHeaderClassName}>
                    {labels.tools}
                  </h2>
                  <ul className="bg-ios-tertiary-background m-0 list-none overflow-hidden rounded-[26px] p-0">
                    {tools.map(renderRow)}
                  </ul>
                </section>
                <ul className="bg-ios-tertiary-background m-0 list-none overflow-hidden rounded-[26px] p-0">
                  {renderRow(home)}
                </ul>
              </nav>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
