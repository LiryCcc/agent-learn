import { getCurrentDefaults } from './defaults.js';
import type { MarkedOptions } from './marked-options.js';
import { block, inline } from './rules.js';
import { Tokenizer } from './tokenizer.js';
import type { Token, TokensList } from './tokens.js';

const arrayItem = <Value>(values: readonly Value[], index: number): Value => {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Missing parser value at index ${index}.`);
  }
  return value;
};

/**
 * Block Lexer
 */
export class Lexer {
  tokens: TokensList;
  options: MarkedOptions;
  state: {
    inLink: boolean;
    inRawBlock: boolean;
    top: boolean;
  };

  #tokenizer: Tokenizer;
  #inlineQueue: { src: string; tokens: Token[] }[];

  constructor(options?: MarkedOptions) {
    // TokenList cannot be created in one go
    this.tokens = Object.assign([], { links: {} });
    this.options = options || getCurrentDefaults();
    this.options.tokenizer = this.options.tokenizer || new Tokenizer();
    this.#tokenizer = this.options.tokenizer;
    this.#tokenizer.options = this.options;
    this.#tokenizer.lexer = this;
    this.#inlineQueue = [];
    this.state = {
      inLink: false,
      inRawBlock: false,
      top: true
    };

    const rules = {
      block: block.normal,
      inline: inline.normal
    };

    if (this.options.pedantic) {
      rules.block = block.pedantic;
      rules.inline = inline.pedantic;
    } else if (this.options.gfm) {
      rules.block = block.gfm;
      if (this.options.breaks) {
        rules.inline = inline.breaks;
      } else {
        rules.inline = inline.gfm;
      }
    }
    this.#tokenizer.rules = rules;
  }

  /**
   * Expose Rules
   */
  static readonly rules = {
    block,
    inline
  };

  /**
   * Static Lex Method
   */
  static lex = (src: string, options?: MarkedOptions) => {
    const lexer = new Lexer(options);
    return lexer.lex(src);
  };

  /**
   * Static Lex Inline Method
   */
  static lexInline = (src: string, options?: MarkedOptions) => {
    const lexer = new Lexer(options);
    return lexer.inlineTokens(src);
  };

  /**
   * Preprocessing
   */
  lex = (src: string) => {
    src = src.replaceAll(/\r\n|\r/g, '\n');

    this.blockTokens(src, this.tokens);

    for (let i = 0; i < this.#inlineQueue.length; i++) {
      const next = arrayItem(this.#inlineQueue, i);
      this.inlineTokens(next.src, next.tokens);
    }
    this.#inlineQueue = [];

    return this.tokens;
  };

  /**
   * Lexing
   */
  blockTokens = (src: string, tokens: Token[] = [], lastParagraphClipped = false): Token[] => {
    if (this.options.pedantic) {
      src = src.replaceAll('\t', ' '.repeat(4)).replaceAll(/^ +$/gm, '');
    } else {
      src = src.replaceAll(/^( *)(\t+)/gm, (_match: string, leading: string, tabs: string) => {
        return leading + ' '.repeat(4).repeat(tabs.length);
      });
    }

    let token: Token | undefined;
    let lastToken: Token | undefined;
    let cutSrc: string;

    while (src) {
      // newline
      if ((token = this.#tokenizer.space(src))) {
        src = src.slice(token.raw.length);
        if (token.raw.length === 1 && tokens.length > 0) {
          // if there's a single \n as a spacer, it's terminating the last line,
          // so move it there so that we don't get unnecessary paragraph tags
          arrayItem(tokens, tokens.length - 1).raw += '\n';
        } else {
          tokens.push(token);
        }
        continue;
      }

      // code
      if ((token = this.#tokenizer.code(src))) {
        src = src.slice(token.raw.length);
        lastToken = tokens.at(-1);
        // An indented code block cannot interrupt a paragraph.
        if (lastToken && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
          lastToken.raw += '\n' + token.raw;
          lastToken.text += '\n' + token.text;
          arrayItem(this.#inlineQueue, this.#inlineQueue.length - 1).src = lastToken.text;
        } else {
          tokens.push(token);
        }
        continue;
      }

      // fences
      if ((token = this.#tokenizer.fences(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // heading
      if ((token = this.#tokenizer.heading(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // hr
      if ((token = this.#tokenizer.hr(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // blockquote
      if ((token = this.#tokenizer.blockquote(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // list
      if ((token = this.#tokenizer.list(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // html
      if ((token = this.#tokenizer.html(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // def
      if ((token = this.#tokenizer.def(src))) {
        src = src.slice(token.raw.length);
        lastToken = tokens.at(-1);
        if (lastToken && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
          lastToken.raw += '\n' + token.raw;
          lastToken.text += '\n' + token.raw;
          arrayItem(this.#inlineQueue, this.#inlineQueue.length - 1).src = lastToken.text;
        } else if (!this.tokens.links[token.tag]) {
          this.tokens.links[token.tag] = {
            href: token.href,
            title: token.title
          };
        }
        continue;
      }

      // table (gfm)
      if ((token = this.#tokenizer.table(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // lheading
      if ((token = this.#tokenizer.lheading(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // top-level paragraph
      cutSrc = src;
      if (this.state.top && (token = this.#tokenizer.paragraph(cutSrc))) {
        lastToken = tokens.at(-1);
        if (lastParagraphClipped && lastToken?.type === 'paragraph') {
          lastToken.raw += '\n' + token.raw;
          lastToken.text += '\n' + token.text;
          this.#inlineQueue.pop();
          arrayItem(this.#inlineQueue, this.#inlineQueue.length - 1).src = lastToken.text;
        } else {
          tokens.push(token);
        }
        lastParagraphClipped = cutSrc.length !== src.length;
        src = src.slice(token.raw.length);
        continue;
      }

      // text
      if ((token = this.#tokenizer.text(src))) {
        src = src.slice(token.raw.length);
        lastToken = tokens.at(-1);
        if (lastToken && lastToken.type === 'text') {
          lastToken.raw += '\n' + token.raw;
          lastToken.text += '\n' + token.text;
          this.#inlineQueue.pop();
          arrayItem(this.#inlineQueue, this.#inlineQueue.length - 1).src = lastToken.text;
        } else {
          tokens.push(token);
        }
        continue;
      }

      if (src) {
        const errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        }
        throw new Error(errMsg);
      }
    }

    this.state.top = true;
    return tokens;
  };

  inline = (src: string, tokens: Token[] = []) => {
    this.#inlineQueue.push({ src, tokens });
    return tokens;
  };

  /**
   * Lexing/Compiling
   */
  inlineTokens = (src: string, tokens: Token[] = []): Token[] => {
    let token: Token | undefined;
    let lastToken: Token | undefined;
    let cutSrc: string;

    // String with links masked to avoid interference with em and strong
    let maskedSrc = src;
    let match: RegExpExecArray | null;
    let keepPrevChar = false;
    let prevChar = '';

    // Mask out reflinks
    if (this.tokens.links) {
      const links = Object.keys(this.tokens.links);
      if (links.length > 0) {
        while ((match = this.#tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
          if (links.includes(match[0].slice(match[0].lastIndexOf('[') + 1, -1))) {
            maskedSrc =
              maskedSrc.slice(0, match.index) +
              '[' +
              'a'.repeat(match[0].length - 2) +
              ']' +
              maskedSrc.slice(this.#tokenizer.rules.inline.reflinkSearch.lastIndex);
          }
        }
      }
    }
    // Mask out other blocks
    while ((match = this.#tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
      maskedSrc =
        maskedSrc.slice(0, match.index) +
        '[' +
        'a'.repeat(match[0].length - 2) +
        ']' +
        maskedSrc.slice(this.#tokenizer.rules.inline.blockSkip.lastIndex);
    }

    // Mask out escaped characters
    while ((match = this.#tokenizer.rules.inline.anyPunctuation.exec(maskedSrc)) != null) {
      maskedSrc =
        maskedSrc.slice(0, match.index) + '++' + maskedSrc.slice(this.#tokenizer.rules.inline.anyPunctuation.lastIndex);
    }

    while (src) {
      if (!keepPrevChar) {
        prevChar = '';
      }
      keepPrevChar = false;

      // escape
      if ((token = this.#tokenizer.escape(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // tag
      if ((token = this.#tokenizer.tag(src))) {
        src = src.slice(token.raw.length);
        lastToken = tokens.at(-1);
        if (lastToken && token.type === 'text' && lastToken.type === 'text') {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }

      // link
      if ((token = this.#tokenizer.link(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // reflink, nolink
      if ((token = this.#tokenizer.reflink(src, this.tokens.links))) {
        src = src.slice(token.raw.length);
        lastToken = tokens.at(-1);
        if (lastToken && token.type === 'text' && lastToken.type === 'text') {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }

      // em & strong
      if ((token = this.#tokenizer.emStrong(src, maskedSrc, prevChar))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // code
      if ((token = this.#tokenizer.codespan(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // br
      if ((token = this.#tokenizer.br(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // del (gfm)
      if ((token = this.#tokenizer.del(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // autolink
      if ((token = this.#tokenizer.autolink(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // url (gfm)
      if (!this.state.inLink && (token = this.#tokenizer.url(src))) {
        src = src.slice(token.raw.length);
        tokens.push(token);
        continue;
      }

      // text
      cutSrc = src;
      if ((token = this.#tokenizer.inlineText(cutSrc))) {
        src = src.slice(token.raw.length);
        if (token.raw.slice(-1) !== '_') {
          // Track prevChar before string of ____ started
          prevChar = token.raw.slice(-1);
        }
        keepPrevChar = true;
        lastToken = tokens.at(-1);
        if (lastToken && lastToken.type === 'text') {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }

      if (src) {
        const errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        }
        throw new Error(errMsg);
      }
    }

    return tokens;
  };
}
