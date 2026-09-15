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

## Dependency direction

- Keep dependencies acyclic and flowing from composition layers toward implementation layers.
- Never add a reverse dependency from a lower layer to a higher layer.
- Frontend dependencies must follow these boundaries:
  - `entry` may depend on `app`.
  - `app` may depend on `router` and `utils`.
  - `router` may depend on `pages` and `components`.
  - `pages` may depend on `components`, `api`, and `utils`.
  - `components` may depend on `utils`.
  - `api` and `utils` must not depend on higher frontend layers.
  - Only `api` may import `@liry-a/agent-core`.
- Agent core dependencies must flow from `index` to orchestration and then to configuration, prompts, and tools.
- Run `pnpm check-code` after changing project source and `pnpm check-layers` after changing imports.
