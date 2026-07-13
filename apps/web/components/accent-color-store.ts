"use client";

import type { AccentColorId } from "../lib/accent-colors";

import { accentColorCookieName, getAccentColor } from "../lib/accent-colors";

type AccentColorListener = () => void;

const accentColorListeners = new Set<AccentColorListener>();
const oneYearInSeconds = 60 * 60 * 24 * 365;
let currentAccentColor: AccentColorId | undefined;

export function getAccentColorSnapshot(): AccentColorId {
  currentAccentColor ??= readAccentColorCookie();
  return currentAccentColor;
}

export function subscribeToAccentColor(listener: AccentColorListener): () => void {
  accentColorListeners.add(listener);
  return function unsubscribeFromAccentColor() {
    accentColorListeners.delete(listener);
  };
}

export function setAccentColor(accentColorId: AccentColorId): void {
  const nextAccentColor = getAccentColor(accentColorId);

  currentAccentColor = accentColorId;
  document.documentElement.dataset.accent = accentColorId;
  document.documentElement.style.setProperty("--accent-hue", String(nextAccentColor.hue));
  document.documentElement.style.setProperty("--accent-chroma", String(nextAccentColor.chroma));
  document.cookie = `${accentColorCookieName}=${accentColorId}; path=/; max-age=${oneYearInSeconds}; samesite=lax`;

  for (const listener of accentColorListeners) listener();
}

function readAccentColorCookie(): AccentColorId {
  const cookiePrefix = `${accentColorCookieName}=`;
  const storedAccentColor = document.cookie
    .split(";")
    .map(function trimCookie(cookie) {
      return cookie.trim();
    })
    .find(function matchesAccentColorCookie(cookie) {
      return cookie.startsWith(cookiePrefix);
    })
    ?.slice(cookiePrefix.length);

  return getAccentColor(storedAccentColor).id;
}
