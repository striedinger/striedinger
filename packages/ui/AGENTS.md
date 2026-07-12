# UI Package Guidelines

These guidelines apply to `packages/ui` in addition to the root guidelines.

## Component foundation

- Build shadcn components on Base UI using the `base-nova` style. Do not add Radix primitives.
- Use Tailwind CSS 4 utilities and tokens for component styling.
- Use `cnfast` through `@workspace/ui/lib/utils` for conditional and conflicting class composition. Do not recreate a `cn` helper with clsx or tailwind-merge.
- Keep shared primitives framework-agnostic; do not couple this package to Next.js.
- Generated or upstream shadcn files may retain their upstream component organization when the root one-component-per-file rule would make maintenance harder.

## Theme

- Follow the operating system color scheme with `prefers-color-scheme`.
- Do not require consumers to add or toggle a manual `dark` class.
- Express reusable colors through theme tokens rather than page-specific hard-coded colors.

## Typography and controls

- Use `Text` as the shared typography primitive. Its simplest usage must remain `<Text>Hello</Text>` with safe size, line-height, weight, and color defaults.
- Pair each `Text` size variant with an appropriate line height and let font family inherit unless a caller explicitly overrides it.
- Keep `Text` polymorphic and preserve the native props and ref type of the selected element.
- Give `Button` a first-class accessible loading state. Keep its original content in layout while loading so transitions never change its dimensions.
- Loading buttons must disable interaction, expose busy state to assistive technology, provide a loading label when available, and respect reduced-motion preferences.
- Use the shared `Image` component when an image needs user-visible loading and failure states. Preserve caller load/error handlers, show a reduced-motion-safe shimmer while loading, and use the shared broken-camera icon for failures.
