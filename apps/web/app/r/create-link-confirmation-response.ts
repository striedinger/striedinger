import "server-only";

const htmlEscapes: Readonly<Record<string, string>> = {
  '"': "&quot;",
  "&": "&amp;",
  "'": "&#39;",
  "<": "&lt;",
  ">": "&gt;",
};

/**
 * Unsigned links could send visitors anywhere, so instead of redirecting, the page names the
 * destination and lets a person follow it with one click. Old links shared before signing keep
 * working this way.
 */
export function createLinkConfirmationResponse(canonicalTargetUrl: string): Response {
  const destinationHost = escapeHtml(new URL(canonicalTargetUrl).host);
  const destinationUrl = escapeHtml(canonicalTargetUrl);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Leaving striedinger.co</title>
<style>
body { font: 16px/1.5 system-ui, sans-serif; margin: 0 auto; max-width: 36rem; padding: 3rem 1rem; color: #1c1c1e; background: #fff; }
a { color: #0a66d6; overflow-wrap: anywhere; }
@media (prefers-color-scheme: dark) { body { color: #f2f2f7; background: #000; } a { color: #409cff; } }
</style>
</head>
<body>
<h1>This link goes to ${destinationHost}</h1>
<p>Continue only if you trust where it was shared.</p>
<p><a href="${destinationUrl}" rel="noopener noreferrer nofollow">${destinationUrl}</a></p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/["&'<>]/g, function escapeCharacter(character) {
    return htmlEscapes[character] ?? character;
  });
}
