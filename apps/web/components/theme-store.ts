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

export function setTheme(themeId: ThemeId): void {
  const nextTheme = getTheme(themeId);

  currentTheme = nextTheme.id;
  document.documentElement.dataset.theme = nextTheme.id;
  document.cookie = `${themeCookieName}=${nextTheme.id}; path=/; max-age=${oneYearInSeconds}; samesite=lax`;
  window.dispatchEvent(new Event("themechange"));

  for (const listener of themeListeners) listener();
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
