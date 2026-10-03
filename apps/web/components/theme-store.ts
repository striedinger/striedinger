"use client";

import type { ThemeId } from "../lib/themes";

import { getTheme, themeCookieName } from "../lib/themes";

type ThemeListener = () => void;

const oneYearInSeconds = 60 * 60 * 24 * 365;
const themeListeners = new Set<ThemeListener>();
let currentTheme: ThemeId | undefined;

export function getThemeSnapshot(): ThemeId {
  currentTheme ??= readThemeCookie();
  return currentTheme;
}

export function subscribeToTheme(listener: ThemeListener): () => void {
  themeListeners.add(listener);
  return function unsubscribeFromTheme() {
    themeListeners.delete(listener);
  };
}

/** Theme presets other than the default load as their own stylesheet when first selected. */
export function getThemeStylesheetHref(themeId: ThemeId): string | null {
  return themeId === "default" ? null : `/themes/${themeId}.css`;
}

function loadThemeStylesheet(themeId: ThemeId): Promise<void> {
  const href = getThemeStylesheetHref(themeId);
  if (!href) return Promise.resolve();
  const existingLink = document.querySelector<HTMLLinkElement>(
    `link[data-theme-stylesheet="${themeId}"]`,
  );
  if (existingLink?.sheet) return Promise.resolve();
  const link = existingLink ?? document.createElement("link");
  const loaded = new Promise<void>(function waitForStylesheet(resolve) {
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => resolve(), { once: true });
  });
  if (!existingLink) {
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.themeStylesheet = themeId;
    document.head.append(link);
  }
  return loaded;
}

export function setTheme(themeId: ThemeId): void {
  const nextTheme = getTheme(themeId);

  currentTheme = nextTheme.id;
  document.cookie = `${themeCookieName}=${nextTheme.id}; path=/; max-age=${oneYearInSeconds}; samesite=lax`;
  for (const listener of themeListeners) listener();

  // Switch palettes once the preset's variables are available so the page never flashes the
  // default palette in between.
  void loadThemeStylesheet(nextTheme.id).then(function applyTheme() {
    if (currentTheme !== nextTheme.id) return undefined;
    document.documentElement.dataset.theme = nextTheme.id;
    window.dispatchEvent(new Event("themechange"));
    return undefined;
  });
}

function readThemeCookie(): ThemeId {
  const cookiePrefix = `${themeCookieName}=`;
  const storedTheme = document.cookie
    .split(";")
    .map(function trimCookie(cookie) {
      return cookie.trim();
    })
    .find(function matchesThemeCookie(cookie) {
      return cookie.startsWith(cookiePrefix);
    })
    ?.slice(cookiePrefix.length);

  return getTheme(storedTheme).id;
}
