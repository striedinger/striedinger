// Every environment variable the app reads, so a misspelled name fails the typecheck.
declare namespace NodeJS {
  interface ProcessEnv {
    readonly BING_SITE_VERIFICATION?: string;
    readonly CARD_LINK_SECRET?: string;
    readonly GOOGLE_SITE_VERIFICATION?: string;
    readonly KV_REST_API_TOKEN?: string;
    readonly KV_REST_API_URL?: string;
    readonly SPOTIFY_CLIENT_ID?: string;
    readonly SPOTIFY_CLIENT_SECRET?: string;
    readonly SPOTIFY_REFRESH_TOKEN?: string;
    readonly TWELVE_DATA_API_KEY?: string;
    readonly UPSTASH_REDIS_REST_TOKEN?: string;
    readonly UPSTASH_REDIS_REST_URL?: string;
  }
}
