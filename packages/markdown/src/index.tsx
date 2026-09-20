import type { CSSProperties, ElementType, ReactNode } from 'react';
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

type MarkdownNodeProps = {
  index: number;
  options: Readonly<Options>;
  parent?: Token | undefined;
};

type MarkdownElementProps = MarkdownNodeProps & {
  children?: ReactNode;
  properties?: Record<string, unknown>;
  tagName: string;
  token: Token;
};

type MarkdownTokensProps = {
  options: Readonly<Options>;
  parent?: Token | undefined;
  tokens: readonly Token[];
};

type MarkdownTokenProps = MarkdownNodeProps & {
  token: Token;
};

type MarkdownTableCellProps = MarkdownNodeProps & {
  cell: TableCellToken;
  parent: Token;
};

const isElementAllowed = (
  tagName: string,
  token: Token,
  index: number,
  parent: Token | undefined,
  options: Readonly<Options>
) => {
  return (
    (options.allowedElements === null ||
      options.allowedElements === undefined ||
      options.allowedElements.includes(tagName)) &&
    (options.disallowedElements === null ||
      options.disallowedElements === undefined ||
      !options.disallowedElements.includes(tagName)) &&
    (options.allowElement === null ||
      options.allowElement === undefined ||
      options.allowElement(token, index, parent) !== false)
  );
};

const MarkdownElement = (props: MarkdownElementProps) => {
  const properties = props.properties ?? {};

  if (!isElementAllowed(props.tagName, props.token, props.index, props.parent, props.options)) {
    return props.options.unwrapDisallowed === true ? props.children : null;
  }

  const customComponent = props.options.components?.[props.tagName];
  const Component = (customComponent ?? props.tagName) as ElementType;
  const componentProperties = customComponent === undefined ? properties : { ...properties, node: props.token };

  return <Component {...componentProperties}>{props.children}</Component>;
};

const MarkdownTokens = (props: MarkdownTokensProps) => {
  return (
    <>
      {props.tokens.map((token, index) => (
        <MarkdownToken key={index} index={index} options={props.options} parent={props.parent} token={token} />
      ))}
    </>
  );
};

const MarkdownTableCell = (props: MarkdownTableCellProps) => {
  const tagName = props.cell.header ? 'th' : 'td';
  const properties =
    props.cell.align === null ? {} : { style: { textAlign: props.cell.align } satisfies CSSProperties };

  return (
    <MarkdownElement
      index={props.index}
      options={props.options}
      parent={props.parent}
      properties={properties}
      tagName={tagName}
      token={props.parent}
    >
      <MarkdownTokens options={props.options} parent={props.parent} tokens={props.cell.tokens} />
    </MarkdownElement>
  );
};

const MarkdownToken = (props: MarkdownTokenProps) => {
  const { index, options, parent, token } = props;
  const childParent = token;

  switch (token.type) {
    case 'space': {
      return token.raw;
    }
    case 'code': {
      const language = token.lang?.split(/\s+/u, 1)[0];
      const properties = language ? { className: `language-${language}` } : {};

      return (
        <MarkdownElement index={index} options={options} parent={parent} tagName='pre' token={token}>
          <MarkdownElement
            index={0}
            options={options}
            parent={token}
            properties={properties}
            tagName='code'
            token={token}
          >
            {`${token.text}\n`}
          </MarkdownElement>
        </MarkdownElement>
      );
    }
    case 'heading': {
      return (
        <MarkdownElement
          index={index}
          options={options}
          parent={parent}
          tagName={`h${String(token.depth)}`}
          token={token}
        >
          <MarkdownTokens options={options} parent={childParent} tokens={token.tokens} />
        </MarkdownElement>
      );
    }
    case 'table': {
      return (
        <MarkdownElement index={index} options={options} parent={parent} tagName='table' token={token}>
          <MarkdownElement index={0} options={options} parent={token} tagName='thead' token={token}>
            <MarkdownElement index={0} options={options} parent={token} tagName='tr' token={token}>
              {token.header.map((cell, cellIndex) => (
                <MarkdownTableCell cell={cell} index={cellIndex} key={cellIndex} options={options} parent={token} />
              ))}
            </MarkdownElement>
          </MarkdownElement>
          <MarkdownElement index={1} options={options} parent={token} tagName='tbody' token={token}>
            {token.rows.map((row, rowIndex) => (
              <MarkdownElement
                index={rowIndex}
                key={rowIndex}
                options={options}
                parent={token}
                tagName='tr'
                token={token}
              >
                {row.map((cell, cellIndex) => (
                  <MarkdownTableCell cell={cell} index={cellIndex} key={cellIndex} options={options} parent={token} />
                ))}
              </MarkdownElement>
            ))}
          </MarkdownElement>
        </MarkdownElement>
      );
    }
    case 'hr': {
      return <MarkdownElement index={index} options={options} parent={parent} tagName='hr' token={token} />;
    }
    case 'blockquote': {
      return (
        <MarkdownElement index={index} options={options} parent={parent} tagName='blockquote' token={token}>
          <MarkdownTokens options={options} parent={childParent} tokens={token.tokens} />
        </MarkdownElement>
      );
    }
    case 'list': {
      const properties = token.ordered && token.start !== 1 ? { start: token.start } : {};

      return (
        <MarkdownElement
          index={index}
          options={options}
          parent={parent}
          properties={properties}
          tagName={token.ordered ? 'ol' : 'ul'}
          token={token}
        >
          <MarkdownTokens options={options} parent={childParent} tokens={token.items} />
        </MarkdownElement>
      );
    }
    case 'list_item': {
      return (
        <MarkdownElement
          index={index}
          options={options}
          parent={parent}
          properties={token.task ? { className: 'task-list-item' } : {}}
          tagName='li'
          token={token}
        >
          {token.task ? (
            <input checked={token.checked === true} disabled={true} readOnly={true} type='checkbox' />
          ) : null}
          <MarkdownTokens options={options} parent={childParent} tokens={token.tokens} />
        </MarkdownElement>
      );
    }
    case 'paragraph': {
      return (
        <MarkdownElement index={index} options={options} parent={parent} tagName='p' token={token}>
          <MarkdownTokens options={options} parent={childParent} tokens={token.tokens} />
        </MarkdownElement>
      );
    }
    case 'html': {
      return options.skipHtml === true ? null : token.text;
    }
    case 'text': {
      return 'tokens' in token ? (
        <MarkdownTokens options={options} parent={childParent} tokens={token.tokens ?? []} />
      ) : (
        token.text
      );
    }
    case 'def': {
      return null;
    }
    case 'escape': {
      return token.text;
    }
    case 'link': {
      const transform = options.urlTransform ?? defaultUrlTransform;
      const href = transform(token.href, 'href', token);
      const properties = token.title ? { href, title: token.title } : { href };

      return (
        <MarkdownElement
          index={index}
          options={options}
          parent={parent}
          properties={properties}
          tagName='a'
          token={token}
        >
          <MarkdownTokens options={options} parent={childParent} tokens={token.tokens} />
        </MarkdownElement>
      );
    }
    case 'image': {
      const transform = options.urlTransform ?? defaultUrlTransform;
      const src = transform(token.href, 'src', token);
      const properties = token.title ? { alt: token.text, src, title: token.title } : { alt: token.text, src };

      return (
        <MarkdownElement
          index={index}
          options={options}
          parent={parent}
          properties={properties}
          tagName='img'
          token={token}
        />
      );
    }
    case 'strong': {
      return (
        <MarkdownElement index={index} options={options} parent={parent} tagName='strong' token={token}>
          <MarkdownTokens options={options} parent={childParent} tokens={token.tokens} />
        </MarkdownElement>
      );
    }
    case 'em': {
      return (
        <MarkdownElement index={index} options={options} parent={parent} tagName='em' token={token}>
          <MarkdownTokens options={options} parent={childParent} tokens={token.tokens} />
        </MarkdownElement>
      );
    }
    case 'codespan': {
      return (
        <MarkdownElement index={index} options={options} parent={parent} tagName='code' token={token}>
          {token.text}
        </MarkdownElement>
      );
    }
    case 'br': {
      return <MarkdownElement index={index} options={options} parent={parent} tagName='br' token={token} />;
    }
    case 'del': {
      return (
        <MarkdownElement index={index} options={options} parent={parent} tagName='del' token={token}>
          <MarkdownTokens options={options} parent={childParent} tokens={token.tokens} />
        </MarkdownElement>
      );
    }
  }
};

export const Markdown = (options: Readonly<Options>) => {
  if (options.allowedElements && options.disallowedElements) {
    throw new Error('Only one of allowedElements and disallowedElements may be provided.');
  }

  return <MarkdownTokens options={options} tokens={Lexer.lex(options.children ?? '', { gfm: true })} />;
};

export const MarkdownAsync = (options: Readonly<Options>): Promise<ReactNode> => Promise.resolve(Markdown(options));

export const MarkdownHooks = (options: Readonly<HooksOptions>): ReactNode => Markdown(options);

export type RemarkGfmOptions = {
  singleTilde?: boolean | null | undefined;
  stringLength?: ((value: string) => number) | null | undefined;
};

export const remarkGfm = (): undefined => undefined;

export default Markdown;
