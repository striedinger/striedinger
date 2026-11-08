# Monorepo Guidelines

These guidelines apply to the entire monorepo. Update this file as the project’s conventions evolve.

## Workspace and tooling

- Maintain the project as a TypeScript monorepo orchestrated by Turborepo.
- Use pnpm exclusively. Keep the root `packageManager` field and `pnpm-lock.yaml` authoritative; do not introduce npm or Yarn lockfiles.
- Target the latest Node.js LTS release and keep `.node-version`, `.nvmrc`, and the `engines.node` ranges in the root and `apps/web` manifests aligned. Vercel builds from `apps/web` and takes its Node.js version from that manifest.
- Keep reusable code in focused workspace packages and applications under `apps/`.
- Put every Rust crate under the top-level `crates/` directory, as a member of the root Cargo workspace (`Cargo.toml`). Name crate directories and packages in kebab-case. Applications under `apps/` consume crates; they do not contain Rust code themselves.
- Use Tailwind CSS utilities for application styling; do not introduce CSS Modules for ordinary component styling.
- Run the relevant package typechecks after changes and run a production build when changes affect Next.js compilation, routing, server actions, metadata, or shared styles.
- Use Oxlint for repository-wide linting and Oxfmt for formatting, import ordering, Tailwind class ordering, and package manifest ordering. Do not introduce parallel ESLint or Prettier configurations.
- Keep shared compiler strictness in `tsconfig.base.json`, which every package extends, and keep Oxlint on its correctness, suspicious, perf, and pedantic categories. Turn off only rules that enforce style rather than behavior. Fix violations instead of suppressing them; when a suppression is unavoidable, use `oxlint-disable-next-line <rule> -- <reason>` with a specific reason.
- Keep React Compiler enabled for the web app and treat compiler diagnostics as correctness failures. Prefer compiler-friendly React patterns over manual memoization added without profiling evidence. The compiler memoizes context values and derived data, so `react/jsx-no-constructed-context-values` is off; pass plain objects instead of wrapping them in `useMemo`.
- Do not create commits or push branches unless the user explicitly requests that action.

## Rust crates

- Keep Rust crates under `crates/` in the root Cargo workspace, which shares the edition, MSRV, dependency versions, and lints. Commit `Cargo.lock`.
- Keep Clippy's pedantic group enabled through `[workspace.lints]` and fix warnings instead of allowing them. Format with `cargo fmt`.
- Run `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -- -D warnings`, and `cargo test --workspace` after Rust changes.
- Keep engine crates free of I/O and presentation: they take inputs and return data or events, and frontends render them.

## Testing

- Use Vitest for unit tests and React Testing Library for UI component behavior.
- Test observable behavior, state transitions, and meaningful outcomes rather than implementation details.
- Avoid tests that merely assert forwarded prop values, CSS classes, static styles, or snapshots without a specific regression they protect.
- Keep each test focused and add coverage where failure would affect users or important application logic.

## Conventions

- Prefer function declarations over functions assigned to constants, including arrow functions, when either form is appropriate.
- Choose clear, descriptive names for variables, functions, components, and types. Names should communicate purpose without requiring surrounding context.
- Extract shared components and utilities when the same behavior or implementation is used in more than one place.
- Keep components focused. Split a component when doing so creates a meaningful, reusable unit or makes the parent substantially easier to understand.
- Define one component per file. Move additional components into their own files and import them where needed. Premade or generated component libraries, such as shadcn components, may retain their upstream file structure.
- Use kebab-case for filenames and directory names, except when a framework or tool requires a specific name.
- Keep simple, one-off logic close to where it is used when it remains readable.

## Avoid

- Premature abstractions that are used once and do not improve clarity, testability, or separation of concerns.
- Wrapper components or helper functions that only rename an existing API without adding meaningful behavior.
- Excessive fragmentation. A new file, component, or function should create a clear boundary or make the code easier to understand.
- Dense inline logic. Extract logic when repetition or complexity makes the surrounding code harder to read.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
