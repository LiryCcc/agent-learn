# @liry-a/markdown

面向 SolidJS 的本地 Markdown 渲染组件，使用 TSX 实现。

- `src/marked/` 保存基于 `marked@14.1.4` 的 CommonMark/GFM lexer、tokenizer 与语法规则。
- `src/index.tsx` 把 token 渲染为 SolidJS JSX，并支持通过 `components` 替换原生元素。
- `solid-js` 是 peer dependency，由使用该库的前端应用提供。
- 包使用工作区共享 TypeScript 配置，并由根目录 Nx 的 lint、build 和缓存任务统一管理。

```tsx
import { Markdown } from '@liry-a/markdown';

const Example = () => <Markdown>{'# Hello, SolidJS!'}</Markdown>;
```

在仓库根目录运行 `pnpm lint` 和 `pnpm build` 即可检查并构建此包。
