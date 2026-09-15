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
