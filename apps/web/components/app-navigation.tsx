"use client";

import type { Locale } from "@workspace/i18n";

import { MenuIcon } from "@workspace/icons/menu-icon";
import { Button } from "@workspace/ui/components/button";
import { Sheet, SheetTrigger } from "@workspace/ui/components/sheet";
import { Text } from "@workspace/ui/components/text";
import Link from "next/link";
import { lazy, Suspense, useState } from "react";

import { localizePath } from "../lib/locale-path";
import { useHasOpened } from "./use-has-opened";

export interface AppNavigationLabels {
  chat: string;
  close: string;
  drop: string;
  ip: string;
  javascript: string;
  json: string;
  image: string;
  pdf: string;
  menu: string;
  navigation: string;
  notes: string;
  og: string;
  podcasts: string;
  selectLanguage: string;
  stocks: string;
  subway: string;
  sudoku: string;
  theme: string;
}

interface AppNavigationProps {
  labels: AppNavigationLabels;
  locale: Locale;
}

function importAppNavigationDrawer() {
  return import("./app-navigation-drawer");
}

const AppNavigationDrawer = lazy(function loadAppNavigationDrawer() {
  return importAppNavigationDrawer().then(function selectDrawer(module) {
    return { default: module.AppNavigationDrawer };
  });
});

export function AppNavigation({ labels, locale }: AppNavigationProps) {
  const homePath = localizePath("/", locale);
  const [isOpen, setIsOpen] = useState(false);
  const hasOpened = useHasOpened(isOpen);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 shadow-[0_1px_0_var(--surface-highlight)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Text
          as={Link}
          size="sm"
          weight="semibold"
          href={homePath}
          className="transition-colors duration-150 hover:text-primary motion-reduce:transition-none"
        >
          Hugo Striedinger
        </Text>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={labels.menu}
                onPointerEnter={importAppNavigationDrawer}
                onFocus={importAppNavigationDrawer}
                onTouchStart={importAppNavigationDrawer}
              />
            }
          >
            <MenuIcon />
          </SheetTrigger>
          {hasOpened ? (
            <Suspense fallback={null}>
              <AppNavigationDrawer labels={labels} locale={locale} />
            </Suspense>
          ) : null}
        </Sheet>
      </div>
    </header>
  );
}
