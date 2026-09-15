import { Fragment, createElement, type ElementType, type ReactElement, type ReactNode } from 'react';
import { Lexer } from './marked/lexer.js';
import type { TableCellToken, Token } from './marked/tokens.js';

const safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i;

export const defaultUrlTransform = (value: string): string => {
  const colon = value.indexOf(':');
  const questionMark = value.indexOf('?');
  const numberSign = value.indexOf('#');
  const slash = value.indexOf('/');

  if (
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign) ||
    safeProtocol.test(value.slice(0, colon))
  ) {
    return value;
  }
  return '';
};

export type ExtraProps = { node?: Token | undefined };
export type Components = Record<string, ElementType>;
export type UrlTransform = (url: string, key: string, node: Readonly<Token>) => string;
export type AllowElement = (
  node: Readonly<Token>,
  index: number,
  parent: Readonly<Token> | undefined
) => boolean | null | undefined;
export type Options = {
  allowElement?: AllowElement | null | undefined;
  allowedElements?: readonly string[] | null | undefined;
  children?: string | null | undefined;
  components?: Components | null | undefined;
  disallowedElements?: readonly string[] | null | undefined;
  rehypePlugins?: readonly unknown[] | null | undefined;
  remarkPlugins?: readonly unknown[] | null | undefined;
  remarkRehypeOptions?: Readonly<Record<string, unknown>> | null | undefined;
  skipHtml?: boolean | null | undefined;
  unwrapDisallowed?: boolean | null | undefined;
  urlTransform?: UrlTransform | null | undefined;
};
export type HooksOptions = Options & { fallback?: ReactNode | null | undefined };

type RenderContext = {
  options: Readonly<Options>;
  parent?: Token | undefined;
};

const renderTokens = (tokens: readonly Token[], context: RenderContext): ReactNode[] =>
  tokens.map((token, index) => renderToken(token, index, context));

const renderElement = (
  tagName: string,
  token: Token,
  index: number,
  context: RenderContext,
  properties: Record<string, unknown>,
  children: ReactNode[]
): ReactNode => {
  const { options } = context;
  const isAllowed =
    (options.allowedElements === null ||
      options.allowedElements === undefined ||
      options.allowedElements.includes(tagName)) &&
    (options.disallowedElements === null ||
      options.disallowedElements === undefined ||
      !options.disallowedElements.includes(tagName)) &&
    (options.allowElement === null ||
      options.allowElement === undefined ||
      options.allowElement(token, index, context.parent) !== false);

  if (!isAllowed) {
    return options.unwrapDisallowed === true ? createElement(Fragment, { key: index }, ...children) : null;
  }

  const customComponent = options.components?.[tagName];
  const component = customComponent ?? tagName;
  const componentProperties =
    customComponent === undefined ? { ...properties, key: index } : { ...properties, key: index, node: token };
  return createElement(component, componentProperties, ...children);
};

const renderTableCell = (cell: TableCellToken, index: number, context: RenderContext, parent: Token): ReactNode => {
  const tagName = cell.header ? 'th' : 'td';
  const properties = cell.align === null ? {} : { style: { textAlign: cell.align } };
  return renderElement(tagName, parent, index, context, properties, renderTokens(cell.tokens, { ...context, parent }));
};

const renderToken = (token: Token, index: number, context: RenderContext): ReactNode => {
  const childContext = { ...context, parent: token };
  switch (token.type) {
    case 'space': {
      return token.raw;
    }
    case 'code': {
      const language = token.lang?.split(/\s+/u, 1)[0];
      const properties = language ? { className: `language-${language}` } : {};
      const code = renderElement('code', token, 0, childContext, properties, [`${token.text}\n`]);
      return renderElement('pre', token, index, context, {}, [code]);
    }
    case 'heading': {
      return renderElement(`h${token.depth}`, token, index, context, {}, renderTokens(token.tokens, childContext));
    }
    case 'table': {
      const headerCells = token.header.map((cell, cellIndex) => renderTableCell(cell, cellIndex, childContext, token));
      const header = renderElement('thead', token, 0, childContext, {}, [
        renderElement('tr', token, 0, childContext, {}, headerCells)
      ]);
      const rows = token.rows.map((row, rowIndex) =>
        renderElement(
          'tr',
          token,
          rowIndex,
          childContext,
          {},
          row.map((cell, cellIndex) => renderTableCell(cell, cellIndex, childContext, token))
        )
      );
      return renderElement('table', token, index, context, {}, [
        header,
        renderElement('tbody', token, 1, childContext, {}, rows)
      ]);
    }
    case 'hr': {
      return renderElement('hr', token, index, context, {}, []);
    }
    case 'blockquote': {
      return renderElement('blockquote', token, index, context, {}, renderTokens(token.tokens, childContext));
    }
    case 'list': {
      const properties = token.ordered && token.start !== 1 ? { start: token.start } : {};
      return renderElement(
        token.ordered ? 'ol' : 'ul',
        token,
        index,
        context,
        properties,
        renderTokens(token.items, childContext)
      );
    }
    case 'list_item': {
      const children = renderTokens(token.tokens, childContext);
      if (token.task) {
        children.unshift(
          createElement('input', { checked: token.checked === true, disabled: true, readOnly: true, type: 'checkbox' })
        );
      }
      return renderElement('li', token, index, context, token.task ? { className: 'task-list-item' } : {}, children);
    }
    case 'paragraph': {
      return renderElement('p', token, index, context, {}, renderTokens(token.tokens, childContext));
    }
    case 'html': {
      return context.options.skipHtml === true ? null : token.text;
    }
    case 'text': {
      return 'tokens' in token && token.tokens ? renderTokens(token.tokens, childContext) : token.text;
    }
    case 'def': {
      return null;
    }
    case 'escape': {
      return token.text;
    }
    case 'link': {
      const transform = context.options.urlTransform ?? defaultUrlTransform;
      const href = transform(token.href, 'href', token);
      const properties = token.title ? { href, title: token.title } : { href };
      return renderElement('a', token, index, context, properties, renderTokens(token.tokens, childContext));
    }
    case 'image': {
      const transform = context.options.urlTransform ?? defaultUrlTransform;
      const src = transform(token.href, 'src', token);
      const properties = token.title ? { alt: token.text, src, title: token.title } : { alt: token.text, src };
      return renderElement('img', token, index, context, properties, []);
    }
    case 'strong': {
      return renderElement('strong', token, index, context, {}, renderTokens(token.tokens, childContext));
    }
    case 'em': {
      return renderElement('em', token, index, context, {}, renderTokens(token.tokens, childContext));
    }
    case 'codespan': {
      return renderElement('code', token, index, context, {}, [token.text]);
    }
    case 'br': {
      return renderElement('br', token, index, context, {}, []);
    }
    case 'del': {
      return renderElement('del', token, index, context, {}, renderTokens(token.tokens, childContext));
    }
  }
};

export const Markdown = (options: Readonly<Options>): ReactElement => {
  if (options.allowedElements && options.disallowedElements) {
    throw new Error('Only one of allowedElements and disallowedElements may be provided.');
  }
  const tokens = Lexer.lex(options.children ?? '', { gfm: true });
  return createElement(Fragment, null, ...renderTokens(tokens, { options }));
};

export const MarkdownAsync = async (options: Readonly<Options>): Promise<ReactElement> => Markdown(options);

export const MarkdownHooks = (options: Readonly<HooksOptions>): ReactNode => Markdown(options);

export type RemarkGfmOptions = {
  singleTilde?: boolean | null | undefined;
  stringLength?: ((value: string) => number) | null | undefined;
};

export const remarkGfm = (): undefined => undefined;

export default Markdown;
