# Web Application Guidelines

These guidelines apply to `apps/web` in addition to the root and `apps/` guidelines.

## Next.js application

- Use current stable Next.js and React 19 patterns, including Server Components and Server Actions where they simplify the interaction.
- Keep development HTTPS enabled.
- Put components shared across routes in `apps/web/components`. Co-locate route-only components in their owning App Router segment.
- Build the language picker with the shared shadcn/Base UI Select rather than a native or one-off dropdown.
- Provide complete, localized Next.js metadata for indexable pages, including canonical URLs, Open Graph data, X card data, robots directives, and structured data when relevant.
- Keep non-home route navigation in route-specific layouts so the home page does not hydrate or download the drawer stack. Use the shared compact app bar and Base UI sheet instead of duplicating page-level headers.
- Leave the home route’s presentation independent from the shared tool navigation.
- Compose every non-home route on the shared wide page canvas so horizontal padding and the desktop content edge remain consistent. Constrain route-specific content inside that canvas when it needs a narrower readable width.
- Keep route identity in content, data visualization, and specialized controls; do not replace shared page backgrounds, typography, surface styling, or spacing with route-specific hard-coded values.
- Request-cache locale and translation composition used by metadata, layouts, and pages.
- Use `next/link` for internal application navigation.

## URL state

- Keep shareable, prefillable tool inputs in query parameters when the state belongs in the URL.
- Update lightweight query state without unnecessary route renders or browser-history entries.
- Do not trigger remote side effects merely by opening a shared URL; require an explicit user action.
- Normalize URLs when comparing them and prevent duplicate submission of a URL whose successful result is already displayed. Enforce duplicate guards in both the client interaction and the server action.

## Local-only tools

- Keep sensitive local-tool input in browser memory when sharing or persistence is not required.
- Do not send local-tool content through Server Actions, API routes, query parameters, analytics, storage, or other network requests unless the feature explicitly requires it.
- Debounce expensive automatic validation, formatting, or derived previews so editing remains responsive.
- Move potentially expensive local parsing off the main thread and bound input size, nesting depth, and rendered node count.

## Daily games

- Seed daily content with the UTC date in `YYYY-MM-DD` form so every visitor receives the same puzzle for a given date and difficulty.
- Keep active game state, timers, and generated share images in the browser; do not send play data to the server.
- Prefer the native file-sharing API for result images and provide a local download fallback when file sharing is unavailable.
- Design game controls for touch first while preserving keyboard input and clear accessible labels.
- Isolate ticking timers from game boards so time updates do not rerender the full interaction tree.
- Keep device haptics explicit and feature-owned rather than adding them as a global atomic-button side effect.

## Live data tools

- Stream slow initial live-data requests behind stable Suspense fallbacks instead of blocking the page shell and heading.
- Keep read-only live-data operations behind validated, rate-limited Server Actions when avoiding a public API surface is an explicit product requirement. Debounce client requests and ignore stale results.
- Render one responsive content tree; do not duplicate mobile and desktop trees and hide one with CSS.
- Pause periodic refreshes while the document is hidden, validate and rate-limit action inputs, and cache upstream data where freshness permits.
- Implement autocomplete inputs with complete combobox semantics and keyboard navigation.

## Remote URL previews

- Treat every submitted URL, redirect, DNS result, response, and discovered asset URL as untrusted.
- Accept only absolute public HTTP(S) URLs on standard ports without embedded credentials.
- Block loopback, private, link-local, reserved, multicast, local, and internal network targets for IPv4, IPv6, and IPv4-mapped IPv6.
- Resolve and validate every returned DNS address, pin the outbound request to a validated address, and support Node’s single-address and `all: true` lookup callback shapes.
- Revalidate every redirect and enforce strict redirect, timeout, response-size, content-type, and rate limits.
- Read only through the closing HTML `head` when metadata extraction does not require the response body.
- Sanitize discovered image URLs with the same public-network checks before rendering them.
- Do not proxy or store third-party preview images unless that hosting responsibility is explicitly accepted. Load validated images credentiallessly in the browser and preserve the visible failure state when the source disallows CORS.
- Preserve useful error categories such as invalid, unsafe, unreachable, non-HTML, oversized, missing metadata, and rate-limited instead of exposing internal errors.
- Prefer X-specific metadata for the X preview, with Open Graph values only as fallbacks.
- For `x.com` and `twitter.com` profile links, mirror X’s profile-card treatment by preferring the Open Graph profile image over the separately declared profile banner.
- Support established legacy aliases such as `twitter:image:src` and secure Open Graph image URLs when primary image tags are absent.
- Render previews at realistic social-feed card dimensions and adapt the image treatment to the declared card type.
- Measure remote preview work on the server and surface the completed duration alongside the normalized preview URL.
- Preserve all usable document-head metadata for raw inspection, including duplicate meta names, the document title, and canonical URL. Bound tag counts and value lengths before returning Server Action state.
