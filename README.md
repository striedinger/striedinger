# TypeScript monorepo

This pnpm/Turborepo workspace contains:

- `apps/web`: a minimal Next.js app.
- `packages/i18n`: framework-independent locale detection, catalog composition, and translation helpers.
- `packages/ui`: shared shadcn components and Tailwind CSS 4 theme tokens.

The workspace targets Node.js 24.18.0, the latest LTS release.

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

## Production rate limiting

Remote metadata previews and MTA actions use a bounded in-process fallback during local development. For deployment-wide limits across Vercel instances, configure an Upstash-compatible Redis integration with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or the equivalent `KV_REST_API_URL` and `KV_REST_API_TOKEN`). Client identifiers are hashed before they are included in rate-limit keys.

## Translations

Translation catalogs live with the app or package that owns their strings. English source text is used as the key, and locale files are loaded individually. Apps explicitly compose only the catalogs they consume through `@workspace/i18n`, allowing unused package catalogs and locale chunks to stay out of the relevant bundle.
