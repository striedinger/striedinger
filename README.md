# TypeScript monorepo

This pnpm/Turborepo workspace contains:

- `apps/web`: a minimal Next.js app.
- `apps/murmur`: a local voice dictation app for macOS (native Swift shell over `crates/murmur-core`; built with Cargo, outside pnpm/Turborepo).
- `crates/murmur-core`: Murmur's Rust core: audio, local speech-to-text and LLM cleanup.
- `crates/murmur-bindgen`: generates Murmur's Swift bindings from the compiled core.
- `crates/pkmn`: a deterministic, data-driven creature battle engine written in Rust.
- `packages/i18n`: framework-independent locale detection, catalog composition, and translation helpers.
- `packages/ui`: shared shadcn components, Tailwind CSS 4 theme tokens, and tweakcn-compatible theme presets.

The workspace targets Node.js 24.20.0 LTS and pnpm 11.25.0.

## Development

```sh
corepack enable
pnpm install
pnpm dev
```

Run the complete local quality gate with:

```sh
pnpm check
```

Oxlint handles repository-wide linting, Oxfmt handles formatting plus import and Tailwind class ordering, and the Next.js application is built with React Compiler enabled.

## Add a shadcn component

Run the CLI from the UI package so generated components stay shared:

```sh
pnpm --dir packages/ui dlx shadcn@latest add button
```

Dark mode follows `prefers-color-scheme`; no `dark` class or theme provider is used.

The web app exposes the full tweakcn preset catalog from the navigation drawer. The selected preset is stored in the `theme` cookie, applied before hydration, and shared by every route through the tokens in `packages/ui/src/styles/themes`.

## Production rate limiting

Remote metadata previews and MTA actions use a bounded in-process fallback during local development. For deployment-wide limits across Vercel instances, configure an Upstash-compatible Redis integration with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or the equivalent `KV_REST_API_URL` and `KV_REST_API_TOKEN`). Client identifiers are hashed before they are included in rate-limit keys.

## Search indexing

The web app publishes canonical and localized sitemap entries, reciprocal language alternatives,
and crawler-friendly metadata. Set `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` in the
production environment to emit the respective ownership verification tags.

Successful production deployment events submit the current sitemap URLs to IndexNow through
`.github/workflows/indexnow.yml`. The public IndexNow key is intentionally committed under
`apps/web/public` as required by the protocol.

## Translations

Translation catalogs live with the app or package that owns their strings. English source text is used as the key, and locale files are loaded individually. Apps explicitly compose only the catalogs they consume through `@workspace/i18n`, allowing unused package catalogs and locale chunks to stay out of the relevant bundle.

## Pokémon card collection

The [pkmn-tcg-dex CLI](crates/pkmn-tcg-dex-cli/README.md) uses a Rust engine in
`crates/pkmn-tcg-dex-core` and SQLite storage in `crates/pkmn-tcg-dex-sqlite`.
The root Cargo workspace runs independently of the pnpm/Turborepo web workspace.

```sh
cargo run -p pkmn-tcg-dex -- add --name Furret
cargo run -p pkmn-tcg-dex -- list --group --table
cargo test -p pkmn-tcg-dex -p pkmn-tcg-dex-core -p pkmn-tcg-dex-sqlite -p pkmn-tcg-dex-tcgdex --locked
cargo clippy -p pkmn-tcg-dex -p pkmn-tcg-dex-core -p pkmn-tcg-dex-sqlite -p pkmn-tcg-dex-tcgdex --all-targets --locked -- -D warnings
cargo fmt -p pkmn-tcg-dex -p pkmn-tcg-dex-core -p pkmn-tcg-dex-sqlite -p pkmn-tcg-dex-tcgdex -- --check
```
