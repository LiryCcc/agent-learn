# Project Agent Instructions

## TypeScript and JavaScript function style

- Define every function with a `const` declaration and an arrow function.
- Do not use function declarations or function expressions written with the `function` keyword.
- Never use an anonymous or inline default export.
- Do not directly default-export a function, arrow function, class, object literal, array literal, call expression, or any other expression.
- Every default-exported value must first be assigned to a named variable, then exported separately with `export default <variableName>`.

Do not use:

```ts
export default () => {};
export default {};
export default defineConfig({});
```

Use:

```ts
const Example = () => {
  // ...
};

export default Example;
```

## Void operator

- Never use the unary `void` operator in TypeScript or JavaScript.
- Do not use `void` to discard a value or silence a floating promise; explicitly await or handle the operation instead.

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

## React effects

- Do not use `useEffect` or `useLayoutEffect` to listen for value changes.
- Derive values during render, handle side effects in event handlers, subscribe to external systems from `src/index.tsx`, or attach listeners with ref callbacks.
- Module-level effects are allowed only in `src/index.tsx`. Other modules export initialize functions for the entry to call.
- Mount-only `useEffect(..., [])` is allowed only to synchronize with an external system that has no entry-file or ref-callback alternative.

## Naming

- Use kebab-case for project-authored source file and directory names.
- Use kebab-case for CSS class names, including CSS Module classes.

## Tests

- Name TypeScript test files `*.test.ts` or `*.test.tsx`.
- Do not use `*.spec.ts` or `*.spec.tsx` test filenames.

## TypeScript configuration

- When a package needs more than one TypeScript configuration, keep `tsconfig.json` as a solution file with `files: []` and references to purpose-specific configurations.
- Name purpose-specific configurations `tsconfig.<purpose>.json`, such as `tsconfig.app.json`, `tsconfig.lib.json`, `tsconfig.node.json`, and `tsconfig.test.json`.
- Extend application or library settings from `tsconfig.test.json`; do not duplicate the production compiler settings in the test configuration.
- Exclude `*.test.ts` and `*.test.tsx` from application and library build configurations.
- Point build tools at the concrete application or library configuration instead of the references-only `tsconfig.json`.

## Tool-call compatibility

- Normalize model-produced tool calls before they enter the LangGraph tool execution pipeline.
- Every tool call must have a non-empty function name and a unique, non-empty call ID, including calls returned by OpenAI-compatible providers that omit either field.
- Preserve the same call ID across the assistant tool call, tool result, frontend record, persisted conversation, and observability events.
- Do not convert an absent tool result into the visible string `undefined`. Only add or render an output field when a concrete result exists.
- When changing tool-call streaming or compatibility code, test a provider response with a missing call ID and verify that the tool result and logs use the generated ID.

## Observability

- Emit structured logs with a trace ID and ordered trace sequence so frontend, agent, tool-call, persistence, and failure events can be correlated.
- Pass objects to console methods only after serializing them with `JSON.stringify`.
- Log tool-call start and completion events with the call ID, function name, status, duration, input, and available output or error.
- Never log or export API keys, authorization headers, cookies, passwords, secrets, or tokens. Redact sensitive fields before persistence and export.

## Development runtime

- Use Node.js 26 for local development, dependency installation, linting, testing, and builds.
- Node.js 26 runs erasable TypeScript directly. Store project checking and tooling scripts as `scripts/*.ts` and execute them with `node scripts/<script-name>.ts`.
- Do not add `tsx`, `ts-node`, or a custom TypeScript loader for root tooling scripts.
- Use `.js` or `.ts` for project scripts; do not add `.mjs` files.
- Use the root `@ast-grep/napi` dependency for AST-aware source checks.
- Use pnpm for workspace and dependency management.
- Keep shared tooling versions in the root `pnpm-workspace.yaml` catalog and reference them with `catalog:` from package manifests.
- Run command-line tools through repository `pnpm` scripts instead of download-on-demand package runners.
- Use Turborepo for package linting, builds, tests, and development task orchestration.
- Run all repository checks with `pnpm check`, checks plus package linting with `pnpm lint`, all unit tests with `pnpm test`, all builds with `pnpm build`, and the frontend development server with `pnpm dev`.
- Keep `agent-core`, `agent-fe`, `markdown`, `utils`, and `web-search-core` on their own Vitest configuration with at least one unit test; tooling-only `build` and `tsconfig` packages do not need unit tests.
- Keep individual root checks as `pnpm check-*` scripts that run `node scripts/...` directly; do not put them in Turbo.

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

## General Guidelines for working with Turborepo

- Run package tasks through `pnpm turbo run <task>` or the existing root `pnpm` scripts (`pnpm build`, `pnpm test`, `pnpm lint`, `pnpm dev`).
- Do not invoke `nx` or Nx plugins.
- Prefix turbo commands with the workspace package manager (`pnpm turbo run ...`) so commands never download a package at runtime.
- Filter tasks with `--filter=@liry-a/<package>` when targeting a single package.
- Root `check-*` scripts are repository-wide scans; run them with `pnpm check-*`, not Turbo.
