# Monorepo Guidelines

These guidelines apply to the entire monorepo. Update this file as the project’s conventions evolve.

## Workspace and tooling

- Maintain the project as a TypeScript monorepo orchestrated by Turborepo.
- Use pnpm exclusively. Keep the root `packageManager` field and `pnpm-lock.yaml` authoritative; do not introduce npm or Yarn lockfiles.
- Target the latest Node.js LTS release and keep `.node-version`, `.nvmrc`, and the root `engines.node` range aligned.
- Keep reusable code in focused workspace packages and applications under `apps/`.
- Use Tailwind CSS utilities for application styling; do not introduce CSS Modules for ordinary component styling.
- Run the relevant package typechecks after changes and run a production build when changes affect Next.js compilation, routing, server actions, metadata, or shared styles.

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
