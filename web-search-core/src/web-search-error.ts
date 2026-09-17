import type { WebSearchProvider } from './web-search-types.js';

export type WebSearchErrorCode =
  | 'aborted'
  | 'authentication'
  | 'invalid-configuration'
  | 'invalid-response'
  | 'network'
  | 'rate-limit'
  | 'timeout'
  | 'upstream';

type WebSearchErrorOptions = {
  code: WebSearchErrorCode;
  message: string;
  provider: WebSearchProvider;
  retryable: boolean;
  status?: number;
};

export class WebSearchError extends Error {
  override readonly name = 'WebSearchError';
  readonly code: WebSearchErrorCode;
  readonly provider: WebSearchProvider;
  readonly retryable: boolean;
  readonly status: number | undefined;

  constructor(options: WebSearchErrorOptions) {
    super(options.message);
    this.code = options.code;
    this.provider = options.provider;
    this.retryable = options.retryable;
    this.status = options.status;
  }
}
