import "server-only";

const visitsListKey = "card:visits";
const visitKeyPrefix = "card:visit:";
const maximumStoredVisits = 10_000;
const visitExpirySeconds = 2_592_000; // 30 days
const crawlerPattern =
  /bot|crawler|spider|facebookexternalhit|slack|discord|whatsapp|telegram|linkedin|pinterest|embedly|cardyb|vkshare|tumblr/i;

export interface VisitServerData {
  at: string;
  city: string;
  clientHints: {
    mobile: string;
    platform: string;
    platformVersion: string;
  };
  country: string;
  ip: string;
  isCrawler: boolean;
  language: string;
  path: string;
  referrer: string;
  region: string;
  targetUrl: string;
  userAgent: string;
}

export function isCrawler(userAgent: string): boolean {
  return crawlerPattern.test(userAgent);
}

export async function recordVisit(visitId: string, data: VisitServerData) {
  await store(visitId, "server", data, true);
}

export async function recordClientData(visitId: string, components: Record<string, string>) {
  await store(visitId, "client", components, false);
}

async function store(visitId: string, field: string, value: unknown, isNewVisit: boolean) {
  const restUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !restToken) {
    console.log(`[card-visit] ${field} ${visitId}`, JSON.stringify(value));
    return;
  }

  const visitKey = `${visitKeyPrefix}${visitId}`;

  try {
    // Client-submitted data is only accepted for visits the server created,
    // so the action cannot be used to mint arbitrary keys. The server write
    // runs in after() and can lose the race against a fast client post, so
    // allow one short retry before giving up.
    if (!isNewVisit) {
      const exists =
        (await visitExists(restUrl, restToken, visitKey)) ||
        (await sleep(700).then(function recheck() {
          return visitExists(restUrl, restToken, visitKey);
        }));

      if (!exists) {
        return;
      }
    }

    const commands: (number | string)[][] = [
      ["HSET", visitKey, field, JSON.stringify(value)],
      ["EXPIRE", visitKey, visitExpirySeconds],
    ];

    if (isNewVisit) {
      commands.push(
        ["LPUSH", visitsListKey, visitId],
        ["LTRIM", visitsListKey, 0, maximumStoredVisits - 1],
      );
    }

    const response = await fetch(`${restUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${restToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      console.error(`[card-visit] KV write failed with status ${response.status}`);
    }
  } catch (error) {
    console.error("[card-visit] KV write failed", error);
  }
}

async function visitExists(restUrl: string, restToken: string, visitKey: string) {
  const response = await fetch(`${restUrl}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${restToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([["EXISTS", visitKey]]),
  });

  if (!response.ok) {
    return false;
  }

  const results = (await response.json()) as Array<{ result?: number }>;
  return results[0]?.result === 1;
}

function sleep(milliseconds: number) {
  return new Promise(function wait(resolve) {
    setTimeout(resolve, milliseconds);
  });
}
