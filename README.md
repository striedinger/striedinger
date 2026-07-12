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

## Add a shadcn component

Run the CLI from the UI package so generated components stay shared:

```sh
pnpm --dir packages/ui dlx shadcn@latest add button
```

Dark mode follows `prefers-color-scheme`; no `dark` class or theme provider is used.

## Translations

Translation catalogs live with the app or package that owns their strings. English source text is used as the key, and locale files are loaded individually. Apps explicitly compose only the catalogs they consume through `@workspace/i18n`, allowing unused package catalogs and locale chunks to stay out of the relevant bundle.
