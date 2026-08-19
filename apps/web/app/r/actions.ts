"use server";

import { headers } from "next/headers";

import { isRateLimited } from "../../lib/rate-limit";
import { recordClientData } from "./log-visit";

const maximumComponentEntries = 25;
const maximumComponentKeyLength = 100;
const maximumComponentValueLength = 500;

export async function saveVisitClientData(visitId: string, components: Record<string, string>) {
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/.test(visitId)) {
    return;
  }

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (
    await isRateLimited({
      identifier: ip,
      maximumRequests: 10,
      scope: "card-client-data",
      windowMilliseconds: 60_000,
    })
  ) {
    return;
  }

  const sanitizedComponents: Record<string, string> = {};

  for (const [key, value] of Object.entries(components)) {
    if (Object.keys(sanitizedComponents).length >= maximumComponentEntries) {
      break;
    }

    if (typeof value !== "string") {
      continue;
    }

    sanitizedComponents[key.slice(0, maximumComponentKeyLength)] = value.slice(
      0,
      maximumComponentValueLength,
    );
  }

  await recordClientData(visitId, sanitizedComponents);
}
