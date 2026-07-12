# Internationalization Package Guidelines

These guidelines apply to `packages/i18n` in addition to the root guidelines.

- Remain framework-agnostic and avoid tying translation primitives to Next.js.
- Use complete natural-language English strings as message keys, with English as the source and fallback language.
- Support `en`, `es`, `de`, `it`, `fr`, `pt`, `zh`, and `ja`.
- Allow apps and packages to own separate catalogs and compose only the catalogs required by a consumer or route.
- Keep catalog loading statically analyzable so production builds can exclude translations that a consumer does not use.
- Translation content may be authored and reviewed with Codex; do not require a runtime model or Ollama service to translate application UI.
