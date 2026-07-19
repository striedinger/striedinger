# UI Package Guidelines

These guidelines apply to `packages/ui` in addition to the root guidelines.

## Component foundation

- Build shadcn components on Base UI using the `base-nova` style. Do not add Radix primitives.
- Use Tailwind CSS 4 utilities and tokens for component styling.
- Use `cnfast` through `@workspace/ui/lib/utils` for conditional and conflicting class composition. Do not recreate a `cn` helper with clsx or tailwind-merge.
- Keep shared primitives framework-agnostic; do not couple this package to Next.js.
- Generated or upstream shadcn files may retain their upstream component organization when the root one-component-per-file rule would make maintenance harder.
- Treat `PageShell`, `PageContainer`, and `PageHeader` as the source of truth for application page rhythm, responsive padding, content widths, typography, and headings.
- Keep `PageContainer` on the shared wide canvas by default. Apply narrower maximum widths to inner content instead of shifting the page container’s outer edge.
- Use `Surface` for standard bordered card and panel treatment. Add route-specific layout inside it instead of recreating radius, border, background, and shadow styles.

## Theme

- Follow the operating system color scheme with `prefers-color-scheme`.
- Do not require consumers to add or toggle a manual `dark` class.
- Express reusable colors through theme tokens rather than page-specific hard-coded colors.
- Keep the visual direction restrained and technical-editorial: warm neutral canvases, selectable tweakcn palettes, tactile controls, fine borders, compact shadows, and clean sans-serif typography.
- Treat semantic surface, inset, highlight, shadow, control, and accent tokens as the source of truth. Route components should not recreate those treatments.
- Derive primary, secondary, soft accent, focus, and ambient colors from the active tweakcn preset. Keep user-selectable presets contrast-safe in both system color schemes.

## Motion

- Use short, purposeful transitions to clarify hover, press, focus, opening, closing, and content arrival states. Avoid ambient or decorative motion in application tools.
- Prefer opacity, transform, color, border, and shadow transitions. Keep ordinary control motion between 100 and 200 milliseconds.
- Respect `prefers-reduced-motion` for every animation and transition, including view transitions.

## Typography and controls

- Use `Text` as the shared typography primitive. Its simplest usage must remain `<Text>Hello</Text>` with safe size, line-height, weight, and color defaults.
- Pair each `Text` size variant with an appropriate line height and let font family inherit unless a caller explicitly overrides it.
- Keep `Text` polymorphic and preserve the native props and ref type of the selected element.
- Give `Button` a first-class accessible loading state. Keep its original content in layout while loading so transitions never change its dimensions.
- Loading buttons must disable interaction, expose busy state to assistive technology, provide a loading label when available, and respect reduced-motion preferences.
- Use the shared `Image` component when an image needs user-visible loading and failure states. Preserve caller load/error handlers, show a reduced-motion-safe shimmer while loading, and use the shared broken-camera icon for failures.
- Keep atomic controls free of implicit device effects such as vibration. Features that need haptics must opt in at their interaction boundary.
