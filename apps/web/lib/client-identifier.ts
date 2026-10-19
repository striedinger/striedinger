import "server-only";
import { headers } from "next/headers";

/** The visitor's address from the proxy's forwarding headers, which keys per-visitor limits. */
export async function getClientIdentifier() {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
