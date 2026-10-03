"use client";

import type { Locale } from "@workspace/i18n";

import { CloseIcon } from "@workspace/icons/close-icon";
import { Button } from "@workspace/ui/components/button";
import { SheetClose, SheetContent, SheetTitle } from "@workspace/ui/components/sheet";
import { Text } from "@workspace/ui/components/text";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AppNavigationLabels } from "./app-navigation";

import { localizePath, stripLocaleFromPath } from "../lib/locale-path";
import { LanguagePicker } from "./language-picker";
import { ThemePicker } from "./theme-picker";

interface AppNavigationDrawerProps {
  labels: AppNavigationLabels;
  locale: Locale;
}

const navigationItems = [
  { href: "/chat", label: "chat" },
  { href: "/drop", label: "drop" },
  { href: "/og", label: "og" },
  { href: "/ip", label: "ip" },
  { href: "/javascript", label: "javascript" },
  { href: "/image", label: "image" },
  { href: "/pdf", label: "pdf" },
  { href: "/json", label: "json" },
  { href: "/sudoku", label: "sudoku" },
  { href: "/mta", label: "subway" },
  { href: "/stocks", label: "stocks" },
  { href: "/podcasts", label: "podcasts" },
  { href: "/notes", label: "notes" },
] as const;

/** The navigation sheet's contents, loaded the first time the menu opens. */
export function AppNavigationDrawer({ labels, locale }: AppNavigationDrawerProps) {
  const basePathname = stripLocaleFromPath(usePathname());

  return (
    <SheetContent>
      <div className="flex h-full flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <SheetTitle render={<Text as="h2" size="xl" weight="semibold" />}>
            {labels.navigation}
          </SheetTitle>
          <SheetClose
            render={
              <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.close} />
            }
          >
            <CloseIcon />
          </SheetClose>
        </div>

        <nav aria-label={labels.navigation}>
          <ul className="flex list-none flex-col gap-1 p-0">
            {navigationItems.map(function renderNavigationItem(item) {
              const isCurrent = basePathname === item.href;
              const href = localizePath(item.href, locale);

              return (
                <li key={item.href}>
                  <Text
                    as={Link}
                    href={href}
                    weight={isCurrent ? "semibold" : "normal"}
                    aria-current={isCurrent ? "page" : undefined}
                    className="block rounded-xl px-3 py-3 transition-[color,background-color,transform] duration-150 hover:translate-x-0.5 hover:bg-accent hover:text-accent-foreground motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    {labels[item.label]}
                  </Text>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-6">
          <Text size="sm" tone="muted">
            {labels.selectLanguage}
          </Text>
          <LanguagePicker locale={locale} label={labels.selectLanguage} />
          <Text size="sm" tone="muted">
            {labels.theme}
          </Text>
          <ThemePicker label={labels.theme} />
        </div>
      </div>
    </SheetContent>
  );
}
