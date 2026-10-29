// Signs in to Spotify once and prints the refresh token the listening page reads from
// SPOTIFY_REFRESH_TOKEN. Add http://127.0.0.1:8888/callback as a redirect URI on the Spotify
// app first, then run:
//   SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=… node scripts/get-spotify-refresh-token.mjs
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
if (!clientId || !clientSecret)
  throw new Error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET before running this script.");

const port = 8888;
const redirectUri = `http://127.0.0.1:${port}/callback`;
const scopes = ["user-read-currently-playing", "user-read-recently-played"];
const state = randomBytes(16).toString("hex");

const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
authorizeUrl.search = new URLSearchParams({
  client_id: clientId,
  response_type: "code",
  redirect_uri: redirectUri,
  scope: scopes.join(" "),
  state,
}).toString();

const server = createServer(function handleCallback(request, response) {
  const url = new URL(request.url ?? "/", redirectUri);
  if (url.pathname !== "/callback") {
    response.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get("code");
  if (url.searchParams.get("state") !== state || !code) {
    response.writeHead(400).end("Sign-in failed or was cancelled. Run the script again.");
    process.exitCode = 1;
    server.close();
    return;
  }

  void finishSignIn(code, response);
});

/**
 * @param {string} code
 * @param {import("node:http").ServerResponse} response
 */
async function finishSignIn(code, response) {
  try {
    const refreshToken = await exchangeCode(code);
    response.end("Done. Copy the refresh token from the terminal, then close this tab.");
    console.log(`\nSPOTIFY_REFRESH_TOKEN=${refreshToken}\n`);
  } catch (error) {
    response.writeHead(500).end("Spotify did not return a refresh token. See the terminal.");
    console.error(error);
    process.exitCode = 1;
  }
  server.close();
}

/** @param {string} code */
async function exchangeCode(code) {
  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = /** @type {{ refresh_token?: unknown }} */ (
    await tokenResponse.json().catch(function readFailedBody() {
      return { error: `Spotify answered ${tokenResponse.status} without JSON` };
    })
  );
  if (!tokenResponse.ok || typeof payload.refresh_token !== "string") {
    throw new Error(`Spotify token exchange failed: ${JSON.stringify(payload)}`);
  }
  return payload.refresh_token;
}

server.listen(port, "127.0.0.1", function printSignInLink() {
  console.log(`Open this link and sign in with your Spotify account:\n\n${authorizeUrl}\n`);
});
