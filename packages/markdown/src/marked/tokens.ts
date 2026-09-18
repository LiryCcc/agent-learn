export type SpaceToken = { type: 'space'; raw: string };
export type CodeToken = {
  type: 'code';
  raw: string;
  codeBlockStyle?: 'indented';
  lang?: string | undefined;
  text: string;
  escaped?: boolean;
};
export type HeadingToken = { type: 'heading'; raw: string; depth: number; text: string; tokens: Token[] };
export type TableCellToken = {
  text: string;
  tokens: Token[];
  header: boolean;
  align: 'center' | 'left' | 'right' | null;
};
export type TableToken = {
  type: 'table';
  raw: string;
  align: Array<'center' | 'left' | 'right' | null>;
  header: TableCellToken[];
  rows: TableCellToken[][];
};
export type HorizontalRuleToken = { type: 'hr'; raw: string };
export type BlockquoteToken = { type: 'blockquote'; raw: string; text: string; tokens: Token[] };
export type ListItemToken = {
  type: 'list_item';
  raw: string;
  task: boolean;
  checked?: boolean | undefined;
  loose: boolean;
  text: string;
  tokens: Token[];
};
export type ListToken = {
  type: 'list';
  raw: string;
  ordered: boolean;
  start: number | '';
  loose: boolean;
  items: ListItemToken[];
};
export type ParagraphToken = { type: 'paragraph'; raw: string; pre?: boolean; text: string; tokens: Token[] };
export type HtmlToken = { type: 'html'; raw: string; pre: boolean; text: string; block: boolean };
export type TextToken = { type: 'text'; raw: string; text: string; tokens?: Token[] };
export type DefinitionToken = { type: 'def'; raw: string; tag: string; href: string; title: string };
export type EscapeToken = { type: 'escape'; raw: string; text: string };
export type TagToken = {
  type: 'text' | 'html';
  raw: string;
  inLink: boolean;
  inRawBlock: boolean;
  text: string;
  block: boolean;
};
export type LinkToken = {
  type: 'link';
  raw: string;
  href: string;
  title?: string | null;
  text: string;
  tokens: Token[];
};
export type ImageToken = { type: 'image'; raw: string; href: string; title: string | null; text: string };
export type StrongToken = { type: 'strong'; raw: string; text: string; tokens: Token[] };
export type EmphasisToken = { type: 'em'; raw: string; text: string; tokens: Token[] };
export type CodeSpanToken = { type: 'codespan'; raw: string; text: string };
export type BreakToken = { type: 'br'; raw: string };
export type DeleteToken = { type: 'del'; raw: string; text: string; tokens: Token[] };
export type Token =
  | SpaceToken
  | CodeToken
  | HeadingToken
  | TableToken
  | HorizontalRuleToken
  | BlockquoteToken
  | ListToken
  | ListItemToken
  | ParagraphToken
  | HtmlToken
  | TextToken
  | DefinitionToken
  | EscapeToken
  | TagToken
  | ImageToken
  | LinkToken
  | StrongToken
  | EmphasisToken
  | CodeSpanToken
  | BreakToken
  | DeleteToken;
export type Links = Record<string, Pick<LinkToken | ImageToken, 'href' | 'title'>>;
export type TokensList = Token[] & { links: Links };
