# Monorepo review — September 5, 2026

Reviewed from `main` at `8aa51f4`. The review and benchmarks were completed before the user authorized committing and pushing to `main`.

## Findings fixed

| Priority | Finding                                                                                                                                                                                                             | Change                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| High     | The JSON tool constructed a worker without sending it any input, leaving validation and previews idle in browsers that support workers. Its existing UI tests were excluded from the suite.                         | Send the input after registering worker listeners. Discover every application UI test, including JSON and PDF routes. Add worker-path coverage.                                      |
| High     | Deep valid JSON reached `JSON.stringify` before the depth/node checks, risking stack overflow and very large formatted output.                                                                                      | Check complexity first, avoid cloning unrenderable trees back to the browser, and keep automatic formatting within the editor's 500,000-character limit.                             |
| High     | Preview URL validation accepted some special-purpose IPv6 networks and relied on textual address prefixes. The socket inactivity timeout did not bound DNS, redirects, or trickling responses.                      | Use subnet checks, reject local hostnames with trailing dots, and enforce one eight-second fetch deadline across DNS and redirects. Stop reading rejected response bodies.           |
| High     | Turbo did not cache generated codec files or account for metadata/API environment variables. A cache restore could omit PDF/AVIF runtime assets; strict environment handling could hide configuration.              | Include vendor assets in build outputs, declare relevant environment variables, and include environment files in build inputs. Include shared test declarations in typecheck inputs. |
| Medium   | A stock chart request waited for unrelated autocomplete suggestions.                                                                                                                                                | Start the chart as soon as its selected stock resolves. Search and chart requests can overlap. A regression test keeps suggestions pending while checking that chart loading starts. |
| Medium   | MTA protobuf feeds were decoded again for each location/filter cache miss. Minute-based deduplication could remove separate trains or miss nonadjacent duplicates.                                                  | Cache decoded arrivals per feed. Deduplicate by route, direction, and exact arrival timestamp, preserving distinct trains in the same minute.                                        |
| Medium   | PDF previews could leave workers alive when unmounted during loading. Page retrieval failures could escape the render error handler. Replacing a PDF during processing could display the old result for a new file. | Register cleanup before waiting for document loading, check cancellation around file reads, catch page retrieval failures, and disable file replacement while processing.            |
| Medium   | PDF rasterization retained a recursive promise chain and did not destroy failed document-loading tasks.                                                                                                             | Process pages iteratively, one at a time to bound image/canvas memory, and destroy the loading task in `finally`.                                                                    |
| Medium   | Podcast progress and watchlists could throw when storage was blocked or full, including from their error handlers. An intentionally empty watchlist was not restored.                                               | Share guarded storage operations, keep in-memory interactions working, restore empty lists, and validate stored currency codes.                                                      |

## Dependency updates

Verified against registry `latest` tags during the review. Updated the pnpm lockfile, including compatible transitive dependencies.

| Component             | Before  | After   |
| --------------------- | ------- | ------- |
| Node LTS target       | 24.18.0 | 24.20.0 |
| pnpm pin              | 11.10.0 | 11.25.0 |
| Next.js               | 16.3.1  | 16.3.4  |
| PDF.js                | 6.2.108 | 6.3.289 |
| Vitest                | 4.1.10  | 5.0.0   |
| Turborepo             | 2.10.10 | 2.10.12 |
| Oxlint                | 1.78.0  | 1.81.0  |
| Oxfmt                 | 0.63.0  | 0.66.0  |
| Knip                  | 6.32.2  | 6.34.0  |
| Testing Library React | 16.3.2  | 16.3.3  |
| cnfast                | 0.1.0   | 0.2.0   |
| Lucide React          | 1.31.0  | 1.40.0  |
| SVGO                  | 4.0.2   | 4.1.0   |
| Trystero              | 0.25.3  | 0.25.4  |
| React DOM types       | 19.2.4  | 19.2.7  |
| actions/checkout      | v4      | v7.0.1  |
| actions/setup-node    | v4      | v7.0.0  |

React 19.2.8 and TypeScript 7.0.2 were already current. Replaced floating `latest` manifest entries with explicit compatible ranges. Node types intentionally use 24.13.3, matching Node 24 LTS rather than Node 26. The final outdated check reported only that intentional major-version difference.

Vitest 5 required a shared matcher-type augmentation for jest-dom. Oxlint's former `react/react-compiler` rule was unavailable in the updated release; React Compiler diagnostics now run through `eslint-plugin-react-hooks` 7.1.1 inside Oxlint. Native hooks rules remain enabled. Narrow, explained suppressions preserve intentional effect triggers for refreshes, changing DOM nodes, and episode changes.

## Validation

- Baseline: 135 tests in 40 files passed, along with the original quality gate.
- Updated: `pnpm check` passed — formatting, lint/React checks, all four workspace typechecks, 167 tests in 45 files, and Knip.
- `pnpm build` passed with Next.js 16.3.4 and React Compiler enabled.
- Validation used Node 24.20.0 and pnpm 11.25.0.
- `pnpm install --frozen-lockfile` passed.
- `pnpm audit --json` reported zero known vulnerabilities.
- Inspected the Turbo cache archive and confirmed it contains the generated PDF/AVIF workers and WASM files.
- `git diff --check` passed.

Browser smoke testing was blocked by local-preview access in this environment. Real browser rendering, cross-device transfers, encrypted pairing, and live upstream services were not verified end to end. No production latency, throughput, bundle-size improvement, or percentage speedup is claimed. The performance changes remove identifiable duplicate work, unnecessary serialization, and request dependencies.

## Reference material

- [Vitest 5 migration](https://vitest.dev/guide/migration/): matcher types and project behavior.
- [Oxlint JavaScript plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html): React Hooks integration within Oxlint.
- [IANA IPv6 special-purpose registry](https://www.iana.org/assignments/iana-ipv6-special-registry): special-purpose subnet restrictions.
- [pnpm update](https://pnpm.io/cli/update): registry-tag based upgrades.
