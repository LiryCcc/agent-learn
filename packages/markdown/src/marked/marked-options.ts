import type { Tokenizer } from './tokenizer.js';

export type MarkedOptions = {
  async?: boolean;
  breaks?: boolean;
  gfm?: boolean;
  hooks?: null;
  pedantic?: boolean;
  renderer?: null;
  silent?: boolean;
  tokenizer?: Tokenizer | null;
  walkTokens?: null;
};
