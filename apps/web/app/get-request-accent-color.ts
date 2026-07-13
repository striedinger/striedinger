import { cookies } from "next/headers";
import { cache } from "react";

import { accentColorCookieName, getAccentColor, type AccentColor } from "../lib/accent-colors";

const getCachedRequestAccentColor = cache(resolveRequestAccentColor);

export function getRequestAccentColor(): Promise<AccentColor> {
  return getCachedRequestAccentColor();
}

async function resolveRequestAccentColor(): Promise<AccentColor> {
  const cookieStore = await cookies();
  return getAccentColor(cookieStore.get(accentColorCookieName)?.value);
}
