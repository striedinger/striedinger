import "server-only";

export interface UpstashRestCredentials {
  token: string;
  url: string;
}

/**
 * The Upstash REST endpoint and token. Vercel's KV integration and a direct Upstash setup use
 * different names, so every caller reads both with the same precedence and talks to one store.
 */
export function getUpstashRestCredentials(): UpstashRestCredentials | undefined {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  return url && token ? { token, url } : undefined;
}
