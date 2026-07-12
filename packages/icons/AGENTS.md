# Icon Package Guidelines

These guidelines apply to `packages/icons` in addition to the root guidelines.

- Keep reusable application icons in this package rather than repeating inline SVG markup across pages.
- Export icons through direct, tree-shakeable subpaths and import only the icon a consumer needs.
- Keep icon components presentation-neutral, accept shared SVG props, and allow consumers to control size and color through CSS.
- Avoid adding a large general-purpose icon dependency for a small set of stable product icons.
