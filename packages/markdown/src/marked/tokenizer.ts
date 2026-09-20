import { getCurrentDefaults } from './defaults.js';
import { codePoints, findClosingBracket, rtrim, splitCells } from './helpers.js';
import type { Lexer } from './lexer.js';
import type { MarkedOptions } from './marked-options.js';
import type { Captures, Rules } from './rules.js';
import type {
  BlockquoteToken,
  BreakToken,
  CodeSpanToken,
  CodeToken,
  DefinitionToken,
  DeleteToken,
  EmphasisToken,
  EscapeToken,
  HeadingToken,
  HorizontalRuleToken,
  HtmlToken,
  ImageToken,
  LinkToken,
  Links,
  ListToken,
  ParagraphToken,
  SpaceToken,
  StrongToken,
  TableToken,
  TagToken,
  TextToken,
  Token
} from './tokens.js';

const capture = (captures: readonly (string | undefined)[], index: number): string => captures[index] ?? '';

const arrayItem = <Value>(values: readonly Value[], index: number): Value => {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Missing parser value at index ${String(index)}.`);
  }
  return value;
};

const outputLink = (
  cap: Captures,
  link: Pick<LinkToken, 'href' | 'title'>,
  raw: string,
  lexer: Lexer
): LinkToken | ImageToken => {
  const href = link.href;
  const title = link.title || null;
  const text = capture(cap, 1).replaceAll(/\\([[\]])/g, '$1');

  if (capture(cap, 0).charAt(0) !== '!') {
    lexer.state.inLink = true;
    const token: LinkToken = {
      type: 'link',
      raw,
      href,
      title,
      text,
      tokens: lexer.inlineTokens(text)
    };
    lexer.state.inLink = false;
    return token;
  }
  return {
    type: 'image',
    raw,
    href,
    title,
    text
  };
};

const indentCodeCompensation = (raw: string, text: string) => {
  const matchIndentToCode = raw.match(/^(\s+)(?:```)/);

  if (matchIndentToCode === null) {
    return text;
  }

  const indentToCode = capture(matchIndentToCode, 1);

  return text
    .split('\n')
    .map((node) => {
      const matchIndentInNode = node.match(/^\s+/);
      if (matchIndentInNode === null) {
        return node;
      }

      const [indentInNode] = matchIndentInNode;

      if (indentInNode.length >= indentToCode.length) {
        return node.slice(indentToCode.length);
      }

      return node;
    })
    .join('\n');
};

/**
 * Tokenizer
 */
export class Tokenizer {
  options: MarkedOptions;
  rules!: Rules; // set by the lexer
  lexer!: Lexer; // set by the lexer

  constructor(options?: MarkedOptions) {
    this.options = options || getCurrentDefaults();
  }

  space = (src: string): SpaceToken | undefined => {
    const cap = this.rules.block.newline.exec(src);
    if (cap && capture(cap, 0).length > 0) {
      return {
        type: 'space',
        raw: capture(cap, 0)
      };
    }

    return undefined;
  };

  code = (src: string): CodeToken | undefined => {
    const cap = this.rules.block.code.exec(src);
    if (cap) {
      const text = capture(cap, 0).replaceAll(/^ {1,4}/gm, '');
      return {
        type: 'code',
        raw: capture(cap, 0),
        codeBlockStyle: 'indented',
        text: !this.options.pedantic ? rtrim(text, '\n') : text
      };
    }

    return undefined;
  };

  fences = (src: string): CodeToken | undefined => {
    const cap = this.rules.block.fences.exec(src);
    if (cap) {
      const raw = capture(cap, 0);
      const text = indentCodeCompensation(raw, capture(cap, 3) || '');

      return {
        type: 'code',
        raw,
        lang: capture(cap, 2)
          ? capture(cap, 2).trim().replace(this.rules.inline.anyPunctuation, '$1')
          : capture(cap, 2),
        text
      };
    }

    return undefined;
  };

  heading = (src: string): HeadingToken | undefined => {
    const cap = this.rules.block.heading.exec(src);
    if (cap) {
      let text = capture(cap, 2).trim();

      // remove trailing #s
      if (text.endsWith('#')) {
        const trimmed = rtrim(text, '#');
        if (this.options.pedantic) {
          text = trimmed.trim();
        } else if (!trimmed || trimmed.endsWith(' ')) {
          // CommonMark requires space before trailing #s
          text = trimmed.trim();
        }
      }

      return {
        type: 'heading',
        raw: capture(cap, 0),
        depth: capture(cap, 1).length,
        text,
        tokens: this.lexer.inline(text)
      };
    }

    return undefined;
  };

  hr = (src: string): HorizontalRuleToken | undefined => {
    const cap = this.rules.block.hr.exec(src);
    if (cap) {
      return {
        type: 'hr',
        raw: rtrim(capture(cap, 0), '\n')
      };
    }

    return undefined;
  };

  blockquote = (src: string): BlockquoteToken | undefined => {
    const cap = this.rules.block.blockquote.exec(src);
    if (cap) {
      let lines = rtrim(capture(cap, 0), '\n').split('\n');
      let raw = '';
      let text = '';
      const tokens: Token[] = [];

      while (lines.length > 0) {
        let inBlockquote = false;
        const currentLines = [];

        let i: number;
        for (i = 0; i < lines.length; i++) {
          // get lines up to a continuation
          const line = arrayItem(lines, i);
          if (/^ {0,3}>/.test(line)) {
            currentLines.push(line);
            inBlockquote = true;
          } else if (!inBlockquote) {
            currentLines.push(line);
          } else {
            break;
          }
        }
        lines = lines.slice(i);

        const currentRaw = currentLines.join('\n');
        const currentText = currentRaw
          // precede setext continuation with 4 spaces so it isn't a setext
          .replaceAll(/\n {0,3}((?:=+|-+) *)(?=\n|$)/g, '\n    $1')
          .replaceAll(/^ {0,3}>[ \t]?/gm, '');
        raw = raw ? `${raw}\n${currentRaw}` : currentRaw;
        text = text ? `${text}\n${currentText}` : currentText;

        // parse blockquote lines as top level tokens
        // merge paragraphs if this is a continuation
        const top = this.lexer.state.top;
        this.lexer.state.top = true;
        this.lexer.blockTokens(currentText, tokens, true);
        this.lexer.state.top = top;

        // if there is no continuation then we are done
        if (lines.length === 0) {
          break;
        }

        const lastToken = tokens.at(-1);

        if (lastToken?.type === 'code') {
          // blockquote continuation cannot be preceded by a code block
          break;
        }
        if (lastToken?.type === 'blockquote') {
          // include continuation in nested blockquote
          const newText = lastToken.raw + '\n' + lines.join('\n');
          const newToken = this.blockquote(newText);
          if (newToken === undefined) {
            break;
          }

          tokens[tokens.length - 1] = newToken;

          raw = raw.slice(0, Math.max(0, raw.length - lastToken.raw.length)) + newToken.raw;
          text = text.slice(0, Math.max(0, text.length - lastToken.text.length)) + newToken.text;
          break;
        }
        if (lastToken?.type === 'list') {
          // include continuation in nested list
          const newText = lastToken.raw + '\n' + lines.join('\n');
          const newToken = this.list(newText);
          if (newToken === undefined) {
            break;
          }

          tokens[tokens.length - 1] = newToken;

          raw = raw.slice(0, Math.max(0, raw.length - lastToken.raw.length)) + newToken.raw;
          text = text.slice(0, Math.max(0, text.length - lastToken.raw.length)) + newToken.raw;
          lines = newText.slice(arrayItem(tokens, tokens.length - 1).raw.length).split('\n');
        }
      }

      return {
        type: 'blockquote',
        raw,
        tokens,
        text
      };
    }

    return undefined;
  };

  list = (src: string): ListToken | undefined => {
    let cap = this.rules.block.list.exec(src);
    if (cap) {
      let bull = capture(cap, 1).trim();
      const isordered = bull.length > 1;

      const list: ListToken = {
        type: 'list',
        raw: '',
        ordered: isordered,
        start: isordered ? +bull.slice(0, -1) : '',
        loose: false,
        items: []
      };

      bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;

      if (this.options.pedantic) {
        bull = isordered ? bull : '[*+-]';
      }

      // Get next list item
      const itemRegex = new RegExp(`^( {0,3}${bull})((?:[\t ][^\\n]*)?(?:\\n|$))`);
      let endsWithBlankLine = false;
      // Check if current bullet point can start a new List Item
      while (src) {
        let endEarly = false;
        let itemContents = '';
        if (!(cap = itemRegex.exec(src))) {
          break;
        }

        if (this.rules.block.hr.test(src)) {
          // End list if bullet was actually HR (possibly move into itemRegex?)
          break;
        }

        let raw = capture(cap, 0);
        src = src.slice(raw.length);

        let line = arrayItem(capture(cap, 2).split('\n', 1), 0).replace(/^\t+/, (t: string) =>
          ' '.repeat(3 * t.length)
        );
        let nextLine = arrayItem(src.split('\n', 1), 0);
        let blankLine = !line.trim();

        let indent: number;
        if (this.options.pedantic) {
          indent = 2;
          itemContents = line.trimStart();
        } else if (blankLine) {
          indent = capture(cap, 1).length + 1;
        } else {
          indent = capture(cap, 2).search(/[^ ]/); // Find first non-space char
          indent = indent > 4 ? 1 : indent; // Treat indented code blocks (> 4 spaces) as having only 1 indent
          itemContents = line.slice(indent);
          indent += capture(cap, 1).length;
        }

        if (blankLine && /^ *$/.test(nextLine)) {
          // Items begin with at most one blank line
          raw += nextLine + '\n';
          src = src.slice(Math.max(0, nextLine.length + 1));
          endEarly = true;
        }

        if (!endEarly) {
          const nestIndent = String(Math.min(3, indent - 1));
          const nextBulletRegex = new RegExp(`^ {0,${nestIndent}}(?:[*+-]|\\d{1,9}[.)])((?:[ \t][^\\n]*)?(?:\\n|$))`);
          const hrRegex = new RegExp(`^ {0,${nestIndent}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`);
          const fencesBeginRegex = new RegExp(`^ {0,${nestIndent}}(?:\`\`\`|~~~)`);
          const headingBeginRegex = new RegExp(`^ {0,${nestIndent}}#`);

          // Check if following lines should be included in List Item
          while (src) {
            const rawLine = arrayItem(src.split('\n', 1), 0);
            nextLine = rawLine;

            // Re-align to follow commonmark nesting rules
            if (this.options.pedantic) {
              nextLine = nextLine.replaceAll(/^ {1,4}(?=( {4})*[^ ])/g, '  ');
            }

            // End list item if found code fences
            if (fencesBeginRegex.test(nextLine)) {
              break;
            }

            // End list item if found start of new heading
            if (headingBeginRegex.test(nextLine)) {
              break;
            }

            // End list item if found start of new bullet
            if (nextBulletRegex.test(nextLine)) {
              break;
            }

            // Horizontal rule found
            if (hrRegex.test(src)) {
              break;
            }

            if (nextLine.search(/[^ ]/) >= indent || !nextLine.trim()) {
              // Dedent if possible
              itemContents += '\n' + nextLine.slice(indent);
            } else {
              // not enough indentation
              if (blankLine) {
                break;
              }

              // paragraph continuation unless last line was a different block level element
              if (line.search(/[^ ]/) >= 4) {
                // indented code block
                break;
              }
              if (fencesBeginRegex.test(line)) {
                break;
              }
              if (headingBeginRegex.test(line)) {
                break;
              }
              if (hrRegex.test(line)) {
                break;
              }

              itemContents += '\n' + nextLine;
            }

            if (!blankLine && !nextLine.trim()) {
              // Check if current line is blank
              blankLine = true;
            }

            raw += rawLine + '\n';
            src = src.slice(Math.max(0, rawLine.length + 1));
            line = nextLine.slice(indent);
          }
        }

        if (!list.loose) {
          // If the previous item ended with a blank line, the list is loose
          if (endsWithBlankLine) {
            list.loose = true;
          } else if (/\n *\n *$/.test(raw)) {
            endsWithBlankLine = true;
          }
        }

        let istask: RegExpExecArray | null = null;
        let ischecked: boolean | undefined;
        // Check for task list items
        if (this.options.gfm) {
          istask = /^\[[ xX]\] /.exec(itemContents);
          if (istask) {
            ischecked = capture(istask, 0) !== '[ ] ';
            itemContents = itemContents.replace(/^\[[ xX]\] +/, '');
          }
        }

        list.items.push({
          type: 'list_item',
          raw,
          task: !!istask,
          checked: ischecked,
          loose: false,
          text: itemContents,
          tokens: []
        });

        list.raw += raw;
      }

      // Do not consume newlines at end of final item. Alternatively, make itemRegex *start* with any newlines to simplify/speed up endsWithBlankLine logic
      const finalItem = arrayItem(list.items, list.items.length - 1);
      finalItem.raw = finalItem.raw.trimEnd();
      finalItem.text = finalItem.text.trimEnd();
      list.raw = list.raw.trimEnd();

      // Item child tokens handled here at end because we needed to have the final item to trim it first
      for (let i = 0; i < list.items.length; i++) {
        this.lexer.state.top = false;
        const listItem = arrayItem(list.items, i);
        listItem.tokens = this.lexer.blockTokens(listItem.text, []);

        if (!list.loose) {
          // Check if list should be loose
          const spacers = listItem.tokens.filter((t) => t.type === 'space');
          const hasMultipleLineBreaks = spacers.some((t) => /\n.*\n/.test(t.raw));

          list.loose = hasMultipleLineBreaks;
        }
      }

      // Set all items to loose if list is loose
      if (list.loose) {
        for (let i = 0; i < list.items.length; i++) {
          arrayItem(list.items, i).loose = true;
        }
      }

      return list;
    }

    return undefined;
  };

  html = (src: string): HtmlToken | undefined => {
    const cap = this.rules.block.html.exec(src);
    if (cap) {
      const token: HtmlToken = {
        type: 'html',
        block: true,
        raw: capture(cap, 0),
        pre: capture(cap, 1) === 'pre' || capture(cap, 1) === 'script' || capture(cap, 1) === 'style',
        text: capture(cap, 0)
      };
      return token;
    }

    return undefined;
  };

  def = (src: string): DefinitionToken | undefined => {
    const cap = this.rules.block.def.exec(src);
    if (cap) {
      const tag = capture(cap, 1).toLowerCase().replaceAll(/\s+/g, ' ');
      const href = capture(cap, 2)
        ? capture(cap, 2)
            .replace(/^<(.*)>$/, '$1')
            .replace(this.rules.inline.anyPunctuation, '$1')
        : '';
      const title = capture(cap, 3)
        ? capture(cap, 3)
            .substring(1, capture(cap, 3).length - 1)
            .replace(this.rules.inline.anyPunctuation, '$1')
        : capture(cap, 3);
      return {
        type: 'def',
        tag,
        raw: capture(cap, 0),
        href,
        title
      };
    }

    return undefined;
  };

  table = (src: string): TableToken | undefined => {
    const cap = this.rules.block.table.exec(src);
    if (!cap) {
      return;
    }

    if (!/[:|]/.test(capture(cap, 2))) {
      // delimiter row must have a pipe (|) or colon (:) otherwise it is a setext heading
      return;
    }

    const headers = splitCells(capture(cap, 1));
    const aligns = capture(cap, 2)
      .replaceAll(/^\||\| *$/g, '')
      .split('|');
    const rows =
      capture(cap, 3) && capture(cap, 3).trim()
        ? capture(cap, 3)
            .replace(/\n[ \t]*$/, '')
            .split('\n')
        : [];

    const item: TableToken = {
      type: 'table',
      raw: capture(cap, 0),
      header: [],
      align: [],
      rows: []
    };

    if (headers.length !== aligns.length) {
      // header and align columns must be equal, rows can be different.
      return;
    }

    for (const align of aligns) {
      if (/^ *-+: *$/.test(align)) {
        item.align.push('right');
      } else if (/^ *:-+: *$/.test(align)) {
        item.align.push('center');
      } else if (/^ *:-+ *$/.test(align)) {
        item.align.push('left');
      } else {
        item.align.push(null);
      }
    }

    for (let i = 0; i < headers.length; i++) {
      item.header.push({
        text: arrayItem(headers, i),
        tokens: this.lexer.inline(arrayItem(headers, i)),
        header: true,
        align: arrayItem(item.align, i)
      });
    }

    for (const row of rows) {
      item.rows.push(
        splitCells(row, item.header.length).map((cell, i) => {
          return {
            text: cell,
            tokens: this.lexer.inline(cell),
            header: false,
            align: arrayItem(item.align, i)
          };
        })
      );
    }

    return item;
  };

  lheading = (src: string): HeadingToken | undefined => {
    const cap = this.rules.block.lheading.exec(src);
    if (cap) {
      return {
        type: 'heading',
        raw: capture(cap, 0),
        depth: capture(cap, 2).charAt(0) === '=' ? 1 : 2,
        text: capture(cap, 1),
        tokens: this.lexer.inline(capture(cap, 1))
      };
    }

    return undefined;
  };

  paragraph = (src: string): ParagraphToken | undefined => {
    const cap = this.rules.block.paragraph.exec(src);
    if (cap) {
      const text =
        capture(cap, 1).charAt(capture(cap, 1).length - 1) === '\n' ? capture(cap, 1).slice(0, -1) : capture(cap, 1);
      return {
        type: 'paragraph',
        raw: capture(cap, 0),
        text,
        tokens: this.lexer.inline(text)
      };
    }

    return undefined;
  };

  text = (src: string): TextToken | undefined => {
    const cap = this.rules.block.text.exec(src);
    if (cap) {
      return {
        type: 'text',
        raw: capture(cap, 0),
        text: capture(cap, 0),
        tokens: this.lexer.inline(capture(cap, 0))
      };
    }

    return undefined;
  };

  escape = (src: string): EscapeToken | undefined => {
    const cap = this.rules.inline.escape.exec(src);
    if (cap) {
      return {
        type: 'escape',
        raw: capture(cap, 0),
        text: capture(cap, 1)
      };
    }

    return undefined;
  };

  tag = (src: string): TagToken | undefined => {
    const cap = this.rules.inline.tag.exec(src);
    if (cap) {
      if (!this.lexer.state.inLink && /^<a /i.test(capture(cap, 0))) {
        this.lexer.state.inLink = true;
      } else if (this.lexer.state.inLink && /^<\/a>/i.test(capture(cap, 0))) {
        this.lexer.state.inLink = false;
      }
      if (!this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(capture(cap, 0))) {
        this.lexer.state.inRawBlock = true;
      } else if (this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(capture(cap, 0))) {
        this.lexer.state.inRawBlock = false;
      }

      return {
        type: 'html',
        raw: capture(cap, 0),
        inLink: this.lexer.state.inLink,
        inRawBlock: this.lexer.state.inRawBlock,
        block: false,
        text: capture(cap, 0)
      };
    }

    return undefined;
  };

  link = (src: string): LinkToken | ImageToken | undefined => {
    const cap = this.rules.inline.link.exec(src);
    if (cap) {
      const trimmedUrl = capture(cap, 2).trim();
      if (!this.options.pedantic && trimmedUrl.startsWith('<')) {
        // commonmark requires matching angle brackets
        if (!trimmedUrl.endsWith('>')) {
          return;
        }

        // ending angle bracket cannot be escaped
        const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), '\\');
        if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
          return;
        }
      } else {
        // find closing parenthesis
        const lastParenIndex = findClosingBracket(capture(cap, 2), '()');
        if (lastParenIndex > -1) {
          const start = capture(cap, 0).indexOf('!') === 0 ? 5 : 4;
          const linkLen = start + capture(cap, 1).length + lastParenIndex;
          cap[2] = capture(cap, 2).slice(0, Math.max(0, lastParenIndex));
          cap[0] = capture(cap, 0).slice(0, Math.max(0, linkLen)).trim();
          cap[3] = '';
        }
      }
      let href = capture(cap, 2);
      let title = '';
      if (this.options.pedantic) {
        // split pedantic href and title
        const link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);

        if (link) {
          href = capture(link, 1);
          title = capture(link, 3);
        }
      } else {
        title = capture(cap, 3) ? capture(cap, 3).slice(1, -1) : '';
      }

      href = href.trim();
      if (href.startsWith('<')) {
        if (this.options.pedantic && !trimmedUrl.endsWith('>')) {
          // pedantic allows starting angle bracket without ending angle bracket
          href = href.slice(1);
        } else {
          href = href.slice(1, -1);
        }
      }
      return outputLink(
        cap,
        {
          href: href ? href.replace(this.rules.inline.anyPunctuation, '$1') : href,
          title: title ? title.replace(this.rules.inline.anyPunctuation, '$1') : title
        },
        capture(cap, 0),
        this.lexer
      );
    }

    return undefined;
  };

  reflink = (src: string, links: Links): LinkToken | ImageToken | TextToken | undefined => {
    let cap: Captures | null;
    if ((cap = this.rules.inline.reflink.exec(src)) || (cap = this.rules.inline.nolink.exec(src))) {
      const linkString = (capture(cap, 2) || capture(cap, 1)).replaceAll(/\s+/g, ' ');
      const link = links[linkString.toLowerCase()];
      if (!link) {
        const text = capture(cap, 0).charAt(0);
        return {
          type: 'text',
          raw: text,
          text
        };
      }
      return outputLink(cap, link, capture(cap, 0), this.lexer);
    }

    return undefined;
  };

  emStrong = (src: string, maskedSrc: string, prevChar = ''): EmphasisToken | StrongToken | undefined => {
    let match = this.rules.inline.emStrongLDelim.exec(src);
    if (!match) return;

    // _ can't be between two alphanumerics. \p{L}\p{N} includes non-english alphabet/numbers as well
    if (capture(match, 3) && /[\p{L}\p{N}]/u.test(prevChar)) return;

    const nextChar = capture(match, 1) || capture(match, 2) || '';

    if (!nextChar || !prevChar || this.rules.inline.punctuation.exec(prevChar)) {
      // unicode Regex counts emoji as 1 char; spread into array for proper count (used multiple times below)
      const lLength = codePoints(capture(match, 0)).length - 1;
      let rDelim: string;
      let rLength: number;
      let delimTotal = lLength,
        midDelimTotal = 0;

      const endReg =
        capture(match, 0)[0] === '*' ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      endReg.lastIndex = 0;

      // Clip maskedSrc to same section of string as src (move to lexer?)
      maskedSrc = maskedSrc.slice(-src.length + lLength);

      while ((match = endReg.exec(maskedSrc)) != null) {
        rDelim =
          capture(match, 1) ||
          capture(match, 2) ||
          capture(match, 3) ||
          capture(match, 4) ||
          capture(match, 5) ||
          capture(match, 6);

        if (!rDelim) continue; // skip single * in __abc*abc__

        rLength = codePoints(rDelim).length;

        if (capture(match, 3) || capture(match, 4)) {
          // found another Left Delim
          delimTotal += rLength;
          continue;
        }
        if (capture(match, 5) || capture(match, 6)) {
          // either Left or Right Delim
          if (lLength % 3 && !((lLength + rLength) % 3)) {
            midDelimTotal += rLength;
            continue; // CommonMark Emphasis Rules 9-10
          }
        }

        delimTotal -= rLength;

        if (delimTotal > 0) continue; // Haven't found enough closing delimiters

        // Remove extra characters. *a*** -> *a*
        rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
        // char length can be >1 for unicode characters;
        const lastCharLength = arrayItem(codePoints(capture(match, 0)), 0).length;
        const raw = src.slice(0, lLength + match.index + lastCharLength + rLength);

        // Create `em` if smallest delimiter has odd char count. *a***
        if (Math.min(lLength, rLength) % 2) {
          const text = raw.slice(1, -1);
          return {
            type: 'em',
            raw,
            text,
            tokens: this.lexer.inlineTokens(text)
          };
        }

        // Create 'strong' if smallest delimiter has even char count. **a***
        const text = raw.slice(2, -2);
        return {
          type: 'strong',
          raw,
          text,
          tokens: this.lexer.inlineTokens(text)
        };
      }
    }

    return undefined;
  };

  codespan = (src: string): CodeSpanToken | undefined => {
    const cap = this.rules.inline.code.exec(src);
    if (cap) {
      let text = capture(cap, 2).replaceAll('\n', ' ');
      const hasNonSpaceChars = /[^ ]/.test(text);
      const hasSpaceCharsOnBothEnds = text.startsWith(' ') && text.endsWith(' ');
      if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
        text = text.substring(1, text.length - 1);
      }
      return {
        type: 'codespan',
        raw: capture(cap, 0),
        text
      };
    }

    return undefined;
  };

  br = (src: string): BreakToken | undefined => {
    const cap = this.rules.inline.br.exec(src);
    if (cap) {
      return {
        type: 'br',
        raw: capture(cap, 0)
      };
    }

    return undefined;
  };

  del = (src: string): DeleteToken | undefined => {
    const cap = this.rules.inline.del.exec(src);
    if (cap) {
      return {
        type: 'del',
        raw: capture(cap, 0),
        text: capture(cap, 2),
        tokens: this.lexer.inlineTokens(capture(cap, 2))
      };
    }

    return undefined;
  };

  autolink = (src: string): LinkToken | undefined => {
    const cap = this.rules.inline.autolink.exec(src);
    if (cap) {
      let text: string;
      let href: string;
      if (capture(cap, 2) === '@') {
        text = capture(cap, 1);
        href = 'mailto:' + text;
      } else {
        text = capture(cap, 1);
        href = text;
      }

      return {
        type: 'link',
        raw: capture(cap, 0),
        text,
        href,
        tokens: [
          {
            type: 'text',
            raw: text,
            text
          }
        ]
      };
    }

    return undefined;
  };

  url = (src: string): LinkToken | undefined => {
    let cap: Captures | null;
    if ((cap = this.rules.inline.url.exec(src))) {
      let text: string;
      let href: string;
      if (capture(cap, 2) === '@') {
        text = capture(cap, 0);
        href = 'mailto:' + text;
      } else {
        // do extended autolink path validation
        let prevCapZero: string;
        do {
          prevCapZero = capture(cap, 0);
          cap[0] = this.rules.inline._backpedal.exec(capture(cap, 0))?.[0] ?? '';
        } while (prevCapZero !== capture(cap, 0));
        text = capture(cap, 0);
        if (capture(cap, 1) === 'www.') {
          href = 'http://' + capture(cap, 0);
        } else {
          href = capture(cap, 0);
        }
      }
      return {
        type: 'link',
        raw: capture(cap, 0),
        text,
        href,
        tokens: [
          {
            type: 'text',
            raw: text,
            text
          }
        ]
      };
    }

    return undefined;
  };

  inlineText = (src: string): TextToken | undefined => {
    const cap = this.rules.inline.text.exec(src);
    if (cap) {
      const text = capture(cap, 0);
      return {
        type: 'text',
        raw: capture(cap, 0),
        text
      };
    }

    return undefined;
  };
}
