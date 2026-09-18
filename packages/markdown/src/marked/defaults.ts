import type { MarkedOptions } from './marked-options.js';

/**
 * Gets the original marked default options.
 */
export const getDefaults = (): MarkedOptions => {
  return {
    async: false,
    breaks: false,
    gfm: true,
    hooks: null,
    pedantic: false,
    renderer: null,
    silent: false,
    tokenizer: null,
    walkTokens: null
  };
};

const defaultsState: { current: MarkedOptions } = { current: getDefaults() };

export const getCurrentDefaults = (): MarkedOptions => defaultsState.current;

export const changeDefaults = (newDefaults: MarkedOptions): void => {
  defaultsState.current = newDefaults;
};
