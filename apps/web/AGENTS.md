# Web Application Guidelines

These guidelines apply to `apps/web` in addition to the root and `apps/` guidelines.

## Next.js application

- Use current stable Next.js and React 19 patterns, including Server Components and Server Actions where they simplify the interaction.
- Keep development HTTPS enabled.
- Put components shared across routes in `apps/web/components`. Co-locate route-only components in their owning App Router segment.
- Build the language picker with the shared shadcn/Base UI Select rather than a native or one-off dropdown.
- Provide complete, localized Next.js metadata for indexable pages, including canonical URLs, Open Graph data, X card data, robots directives, and structured data when relevant.
- Run every app and tool route as a native iOS app (see Native app replicas) and link them through the app switcher. Keep that chrome in route layouts so the home page does not hydrate or download it.
- Leave the home route’s presentation independent from the shared tool navigation.
- Compose pages outside the native apps, such as `/card`, on the shared wide page canvas so horizontal padding and the desktop content edge remain consistent.
- On pages outside the native apps, keep route identity in content, data visualization, and specialized controls; do not replace shared page backgrounds, typography, surface styling, or spacing with route-specific hard-coded values.
- Request-cache locale and translation composition used by metadata, layouts, and pages.
- Use `next/link` for internal application navigation.
- Use native and React/Next view transitions as progressive enhancement. Keep navigation usable without them and disable or minimize their animation for reduced-motion users.
- Keep the global stylesheet to the Editorial default theme. Other theme presets are published by `scripts/sync-theme-assets.mjs` as `/themes/<id>.css` and loaded only when selected, so do not import them into `globals.css`.
- Read request-time data such as cookies only where a page needs it; shared layouts that can render without it stay static.

## Locale routing

- Put every page route under `app/[locale]`, whose layout is the root layout and sets `<html lang>`. Every locale, including English, is generated statically.
- Keep URLs free of locale codes for English: `proxy.ts` rewrites unprefixed URLs to the visitor's saved or browser language, redirects `/en/...` to the unprefixed URL, and keeps Open Graph images for unprefixed URLs in English because they are shared and cached.
- Read the current locale with `getRequestLocale()`, which uses `next/root-params`, instead of request headers or cookies, so pages stay static. Route handlers such as Open Graph images read `params` with `getRouteLocale(params)`.
- Compute request-time values such as the current date inside a Suspense boundary after `await connection()`, so the rest of the page still prerenders.

## Native app replicas

- Build native app replicas, such as Notes, Podcasts, Drop, Sudoku, MTA, and Stocks, and the browser tools (Chat, Open Graph, IP, JavaScript, JSON, Image, PDF) inside the shared `IosAppFrame`. Single-screen tools use `NativeToolLayout` for their layout and render `IosToolScreen` from the server page, without explainer sections. It supplies Apple system color tokens, Liquid Glass material tokens, the system font stack, and the portal container that menus, alerts, and sheets render into.
- Match the current iOS design language (iOS 26 Liquid Glass): floating glass bar buttons, toolbars, and tab bars over content with scroll-edge fades instead of opaque bars, using `iosGlassClassName` from `components/ios/ios-glass`.
- These routes intentionally run full screen like installed apps: no shared app bar, a full-viewport frame with safe-area insets, and native styling instead of the shared page canvas, surfaces, and site palette. Keep each app's tint as a CSS variable on its frame.
- Keep native replicas fast on phones: load popups (menus, alerts, sheets) on first use, subscribe to the narrowest store slice a component needs, keep navigation handlers stable, and reuse cached `Intl` formatters from `lib/intl-cache`.
- Reuse the primitives in `components/ios` for navigation bars, search fields, lists, segmented controls, menus, alerts, swipe actions, and stack transitions before adding route-specific chrome. Render the large-title navigation bar from the server page, outside the data's Suspense boundary, so the title and `<h1>` paint immediately and placeholders never repeat them.
- Link the native apps to each other and to the site's tools through the app switcher: pass `appSwitcher` (labels from `getAppSwitcherLabels`) to `IosAppFrame` in the app's layout and put `IosAppSwitcherButton` in the leading slot of the navigation bar on the app's root screens, so it always sits top left above the large title. Its sheet loads on first touch, hover, or focus.
- Give every screen a real path route, not a search parameter: `/podcasts/[show]` (an Apple-style `title-slug-id` segment), `/notes/[folderId]/[noteId]`. Keep query parameters for data filters such as a search query.
- Put persistent chrome (tab bars, toolbars, mini players, sheets, toasts) and app-wide state in the app's `layout.tsx`, so it stays in place while screens push and pop beneath it. Give bars a `view-transition-name` with the `ios-anchored` or `ios-toolbar` class so screen slides pass under them.
- For apps whose screens load server data, such as Podcasts, render each screen from its route's page inside `IosScreen`, wrap the layout in `IosNavigationProvider`, and navigate with `IosLink` or `useIosRouter`. Pushes and pops are router navigations tagged with `ios-nav-*` transition types; the provider replays browser back and forward to app-pushed entries as tagged navigations through the listener `instrumentation-client.ts` installs ahead of the router. Next.js keeps visited screens mounted in hidden `<Activity>` boundaries, and `IosScreen` restores their scroll position.
- For apps whose content lives only in the browser, such as Notes, render the screens from the layout and drive them with `useIosNavigation`, which changes the route in React state and writes the path through the History API after commit, so moving between screens never waits on the server. The route files exist so links and reloads open each screen directly.
- Push screens before their data arrives. Render what the app already knows immediately, load the rest through the route's Server Components, pass it to the client as a promise, and read it with `use()` inside Suspense boundaries wrapped in `IosRevealTransition`. Give every Suspense boundary a placeholder shaped like the content it replaces, and render placeholders for browser-stored data until hydration with `useIsHydrated` instead of letting sections pop in.
- Start at most one view transition per navigation. Reveal streamed content with CSS animations (`IosRevealTransition`) rather than `<ViewTransition>`, which would cut a running slide short, and avoid entry animations on content inside routes Next.js hides and shows again, since they replay.
- Bottom bars ride above the software keyboard with `translate-y-[calc(-1*var(--keyboard-inset,0px))]`, which `IosAppFrame` publishes, and subtract the same inset from their safe-area bottom padding.

## URL state

- Keep shareable, prefillable tool inputs in query parameters when the state belongs in the URL.
- Update lightweight query state without unnecessary route renders or browser-history entries.
- Treat submitted read-only query parameters as load intent and resolve them through Server Components. Never trigger mutations or other write side effects merely by opening a shared URL.
- Normalize remote URL inputs at the validation and fetch boundary, and avoid redundant navigation when the requested URL is already current.

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
- Drive internal read-only data through Server Components keyed by route params or search params. Use string-action `next/form` submissions or client navigation to update URL state, and debounce live-search navigation where appropriate.
- Do not use Server Actions or Route Handlers for internal reads. Reserve Server Actions for mutations and Route Handlers for external HTTP contracts such as webhooks, public APIs, redirects, or non-page responses.
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
- Preserve all usable document-head metadata for raw inspection, including duplicate meta names, the document title, and canonical URL. Bound tag counts and value lengths before returning data from the server loader.
