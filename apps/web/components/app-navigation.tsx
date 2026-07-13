"use client";

import type { Locale } from "@workspace/i18n";

import { CloseIcon } from "@workspace/icons/close-icon";
import { MenuIcon } from "@workspace/icons/menu-icon";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Text } from "@workspace/ui/components/text";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AccentColorId } from "../lib/accent-colors";

import { AccentColorPicker } from "./accent-color-picker";
import { LanguagePicker } from "./language-picker";

interface AppNavigationLabels {
  accentColor: string;
  close: string;
  json: string;
  menu: string;
  navigation: string;
  og: string;
  selectLanguage: string;
  subway: string;
  sudoku: string;
}

interface AppNavigationProps {
  accentColor: AccentColorId;
  labels: AppNavigationLabels;
  locale: Locale;
}

const navigationItems = [
  { href: "/og", label: "og" },
  { href: "/json", label: "json" },
  { href: "/sudoku", label: "sudoku" },
  { href: "/mta", label: "subway" },
] as const;

export function AppNavigation({ accentColor, labels, locale }: AppNavigationProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 shadow-[0_1px_0_var(--surface-highlight)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Text
          as={Link}
          size="sm"
          weight="semibold"
          href="/"
          className="transition-colors duration-150 hover:text-primary motion-reduce:transition-none"
        >
          Hugo Striedinger
        </Text>

        <Sheet>
          <SheetTrigger
            render={
              <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.menu} />
            }
          >
            <MenuIcon />
          </SheetTrigger>
          <SheetContent>
            <div className="flex h-full flex-col gap-8">
              <div className="flex items-center justify-between gap-4">
                <SheetTitle render={<Text as="h2" size="xl" weight="semibold" />}>
                  {labels.navigation}
                </SheetTitle>
                <SheetClose
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={labels.close}
                    />
                  }
                >
                  <CloseIcon />
                </SheetClose>
              </div>

              <nav aria-label={labels.navigation}>
                <ul className="flex list-none flex-col gap-1 p-0">
                  {navigationItems.map(function renderNavigationItem(item) {
                    const isCurrent = pathname === item.href;

                    return (
                      <li key={item.href}>
                        <Text
                          as={Link}
                          href={item.href}
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
                  {labels.accentColor}
                </Text>
                <AccentColorPicker accentColor={accentColor} label={labels.accentColor} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export type { AppNavigationLabels };
