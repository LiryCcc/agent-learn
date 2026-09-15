# @liry-v/react-markdown

本包是 Markdown 编辑器使用的本地 vendor 包，源码全部为 TypeScript。

- `src/marked/` 保存基于 `marked@14.1.4` 的 CommonMark/GFM lexer、tokenizer 与语法规则，`src/index.ts` 直接把 token 渲染成 React 元素。
- 包本身不声明 `dependencies` 或 `optionalDependencies`；React 作为宿主应用提供的 peer dependency 保持外置。
- `tsconfig.json` 通过包名继承 `@liry-v/tsconfig/base.json`，ESLint 配置通过包名继承 `@liry-v/eslint-config`；`src`、构建配置和校验脚本都进入 TypeScript 与 ESLint 检查。
- `tsdown` 只输出 ESM；构建校验会拒绝非 TypeScript 源码、普通运行时依赖和从 `node_modules` 混入的 source map 源码。

在仓库根目录运行：

```sh
pnpm run build:vendor
```
