# Project Agent Instructions

## TypeScript and JavaScript function style

- Define every function with a `const` declaration and an arrow function.
- Do not use function declarations or function expressions written with the `function` keyword.
- Never use `export default function`.
- For default exports, define the arrow function first and export it separately.

```ts
const Example = () => {
  // ...
};

export default Example;
```

## JSX text nodes

- Do not write visible text as a bare JSX text node.
- Wrap numeric and string content in a JSX expression.

Do not use:

```tsx
<div>123</div>
```

Use:

```tsx
<div>{123}</div>
<div>{'123'}</div>
<div>{'123abc'}</div>
```

## Naming

- Use kebab-case for project-authored source file and directory names.
- Use kebab-case for CSS class names, including CSS Module classes.

## Development runtime

- Use Node.js 26 for local development, dependency installation, linting, testing, and builds.
- Node.js 26 runs erasable TypeScript directly. Store project checking and tooling scripts as `scripts/*.ts` and execute them with `node scripts/<script-name>.ts`.
- Do not add `tsx`, `ts-node`, or a custom TypeScript loader for root tooling scripts.
- Use the root `@ast-grep/napi` dependency for AST-aware source checks.
- Use pnpm for workspace and dependency management.
- Use Nx for repository checks, package linting, builds, and development task orchestration.
- Run all repository checks with `pnpm check`, checks plus package linting with `pnpm lint`, all builds with `pnpm build`, and the frontend development server with `pnpm dev`.
- Keep individual root checks as Nx targets and invoke them through their existing `pnpm check-*` scripts.

## Dependency direction

- Keep dependencies acyclic and flowing from composition layers toward implementation layers.
- Never add a reverse dependency from a lower layer to a higher layer.
- Import another workspace package through its declared package name.
- Never use a relative import, export, dynamic import, or `require` path that leaves the current workspace package.
- Root tooling must not reference a child workspace package through a relative module path.
- Frontend dependencies must follow these boundaries:
  - `entry` may depend on `app`.
  - `app` may depend on `router` and `utils`.
  - `router` may depend on `pages` and `components`.
  - `pages` may depend on `components`, `api`, and `utils`.
  - `components` may depend on `utils`.
  - `api` and `utils` must not depend on higher frontend layers.
  - Only `api` may import `@liry-a/agent-core`.
- Agent core dependencies must flow from `index` to orchestration and then to configuration, prompts, and tools.
- Run `pnpm check-code` after changing project source, `pnpm check-packages` after changing workspace imports, and `pnpm check-layers` after changing layer imports.
