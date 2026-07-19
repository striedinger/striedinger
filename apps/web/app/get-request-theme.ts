import { cookies } from "next/headers";
import { cache } from "react";

import { getTheme, themeCookieName, type Theme } from "../lib/themes";

const getCachedRequestTheme = cache(resolveRequestTheme);

export function getRequestTheme(): Promise<Theme> {
  return getCachedRequestTheme();
}

async function resolveRequestTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  return getTheme(cookieStore.get(themeCookieName)?.value);
}
