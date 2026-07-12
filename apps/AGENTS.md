# Application Guidelines

These guidelines apply to every application under `apps/` in addition to the root monorepo guidelines.

## Component organization

- Co-locate route-specific components with the page or route segment that owns them.
- Keep an application's shared `components/` directory for components used by multiple routes or across the application.
- Move a component into shared `components/` only when it has a real cross-route use case; do not centralize components preemptively.
- Prefer parent-owned flex or grid `gap` for spacing between siblings. Avoid using child margins for layout spacing when a parent can express the relationship clearly.

## Typography

- Use `@workspace/ui/components/text` for app-owned headings, paragraphs, labels, and other visible text instead of styling raw text elements directly.
- Keep structural inline elements inside `Text` when they need to inherit the surrounding typography, such as an animated emoji or a phrase-level wrapper.
- Let `Text` inherit the surrounding font family. Set its `family` prop only for an intentional local override such as monospace metadata.

## Internationalization

- Route every user-facing string through the shared `@workspace/i18n` translation catalog, including headings, labels, accessibility text, validation messages, and metadata.
- Use the complete English source text as the translation key. English is the source language and the fallback for missing translations.
- Keep brand names, personal names, URLs, language endonyms, and other intentionally invariant content outside the translation catalog.
- Add or update every supported locale whenever an English source string changes. Do not ship untranslated keys in non-English catalogs.
- Support English as the source language plus Spanish, German, Italian, French, Portuguese, Chinese, and Japanese.
- Detect the initial locale from the browser/request language and persist explicit picker changes without requiring locale codes in application URLs.
- Keep message catalogs owned by the app, package, or route that uses them. Compose catalogs at their consumer boundary so builds do not include unrelated translations.
