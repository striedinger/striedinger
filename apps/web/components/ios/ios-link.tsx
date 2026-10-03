"use client";

import type { ComponentPropsWithRef, MouseEvent } from "react";

import Link from "next/link";

import type { IosNavigationDirection } from "./ios-navigation-transition";

import { useIosRouter } from "./ios-navigation-context";

type IosLinkProps = Omit<ComponentPropsWithRef<typeof Link>, "href" | "replace" | "scroll"> & {
  direction?: IosNavigationDirection | "none";
  href: string;
};

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

/**
 * A link to another screen of a native app replica. Ordinary clicks push the screen with a
 * slide through `useIosRouter`; modified clicks open a new tab like any link.
 */
export function IosLink({
  children,
  direction = "forward",
  href,
  onClick,
  ...props
}: IosLinkProps) {
  const iosRouter = useIosRouter();

  return (
    <Link
      {...props}
      href={href}
      scroll={false}
      onClick={function pushScreen(event: MouseEvent<HTMLAnchorElement>) {
        onClick?.(event);
        if (event.defaultPrevented || isModifiedClick(event)) return;
        event.preventDefault();
        iosRouter.push(href, { direction });
      }}
    >
      {children}
    </Link>
  );
}
