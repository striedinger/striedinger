import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

const instagramWebViewUserAgentPattern = /\bInstagram\b/;

export function proxy(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";

  if (!instagramWebViewUserAgentPattern.test(userAgent)) {
    return NextResponse.next();
  }

  const targetUrl = encodeURIComponent(request.nextUrl.href);

  return NextResponse.redirect(`instagram://extbrowser/?url=${targetUrl}`, 307);
}
