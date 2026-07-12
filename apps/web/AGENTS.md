# Web Application Guidelines

These guidelines apply to `apps/web` in addition to the root and `apps/` guidelines.

## Next.js application

- Use current stable Next.js and React 19 patterns, including Server Components and Server Actions where they simplify the interaction.
- Keep development HTTPS enabled.
- Put components shared across routes in `apps/web/components`. Co-locate route-only components in their owning App Router segment.
- Build the language picker with the shared shadcn/Base UI Select rather than a native or one-off dropdown.
- Provide complete, localized Next.js metadata for indexable pages, including canonical URLs, Open Graph data, X card data, robots directives, and structured data when relevant.

## URL state

- Keep shareable, prefillable tool inputs in query parameters when the state belongs in the URL.
- Update lightweight query state without unnecessary route renders or browser-history entries.
- Do not trigger remote side effects merely by opening a shared URL; require an explicit user action.
- Normalize URLs when comparing them and prevent duplicate submission of a URL whose successful result is already displayed. Enforce duplicate guards in both the client interaction and the server action.

## Local-only tools

- Keep sensitive local-tool input in browser memory when sharing or persistence is not required.
- Do not send local-tool content through Server Actions, API routes, query parameters, analytics, storage, or other network requests unless the feature explicitly requires it.
- Debounce expensive automatic validation, formatting, or derived previews so editing remains responsive.

## Remote URL previews

- Treat every submitted URL, redirect, DNS result, response, and discovered asset URL as untrusted.
- Accept only absolute public HTTP(S) URLs on standard ports without embedded credentials.
- Block loopback, private, link-local, reserved, multicast, local, and internal network targets for IPv4, IPv6, and IPv4-mapped IPv6.
- Resolve and validate every returned DNS address, pin the outbound request to a validated address, and support Node’s single-address and `all: true` lookup callback shapes.
- Revalidate every redirect and enforce strict redirect, timeout, response-size, content-type, and rate limits.
- Read only through the closing HTML `head` when metadata extraction does not require the response body.
- Sanitize discovered image URLs with the same public-network checks before rendering them.
- Preserve useful error categories such as invalid, unsafe, unreachable, non-HTML, oversized, missing metadata, and rate-limited instead of exposing internal errors.
- Prefer X-specific metadata for the X preview, with Open Graph values only as fallbacks.
- For `x.com` and `twitter.com` profile links, mirror X’s profile-card treatment by preferring the Open Graph profile image over the separately declared profile banner.
- Support established legacy aliases such as `twitter:image:src` and secure Open Graph image URLs when primary image tags are absent.
- Render previews at realistic social-feed card dimensions and adapt the image treatment to the declared card type.
- Measure remote preview work on the server and surface the completed duration alongside the normalized preview URL.
- Preserve all usable document-head metadata for raw inspection, including duplicate meta names, the document title, and canonical URL. Bound tag counts and value lengths before returning Server Action state.
