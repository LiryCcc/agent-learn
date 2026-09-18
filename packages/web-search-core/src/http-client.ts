import { WebSearchError, type WebSearchErrorCode } from './web-search-error.js';
import type { WebSearchFetch, WebSearchProvider } from './web-search-types.js';

type RequestJsonOptions = {
  fetch?: WebSearchFetch | undefined;
  init: RequestInit;
  provider: WebSearchProvider;
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
  url: string | URL;
};

const DEFAULT_TIMEOUT_MS = 15_000;

const getHttpErrorCode = (status: number): WebSearchErrorCode => {
  if (status === 401 || status === 403) {
    return 'authentication';
  }

  if (status === 429) {
    return 'rate-limit';
  }

  return 'upstream';
};

const getHttpErrorMessage = (provider: WebSearchProvider, status: number): string => {
  if (status === 401 || status === 403) {
    return `${provider} rejected the API credentials`;
  }

  if (status === 429) {
    return `${provider} rate limit exceeded`;
  }

  return `${provider} search request failed with HTTP ${status}`;
};

export const createEndpointUrl = (provider: WebSearchProvider, endpoint: string): URL => {
  try {
    return new URL(endpoint);
  } catch {
    throw new WebSearchError({
      code: 'invalid-configuration',
      message: `${provider} search endpoint is not a valid URL`,
      provider,
      retryable: false
    });
  }
};

export const requestJson = async (options: RequestJsonOptions): Promise<unknown> => {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const abortController = new AbortController();
  let timedOut = false;

  const abortFromCaller = () => {
    abortController.abort(options.signal?.reason);
  };

  if (options.signal?.aborted) {
    abortFromCaller();
  } else {
    options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  const timeout = setTimeout(() => {
    timedOut = true;
    abortController.abort();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetchImplementation(options.url, {
      ...options.init,
      signal: abortController.signal
    });
  } catch {
    const abortedByCaller = options.signal?.aborted === true;
    const code = timedOut ? 'timeout' : abortedByCaller ? 'aborted' : 'network';

    throw new WebSearchError({
      code,
      message: timedOut
        ? `${options.provider} search request timed out`
        : abortedByCaller
          ? `${options.provider} search request was aborted`
          : `${options.provider} search request failed`,
      provider: options.provider,
      retryable: timedOut || (!abortedByCaller && code === 'network')
    });
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }

  if (!response.ok) {
    const code = getHttpErrorCode(response.status);

    throw new WebSearchError({
      code,
      message: getHttpErrorMessage(options.provider, response.status),
      provider: options.provider,
      retryable: response.status === 429 || response.status >= 500,
      status: response.status
    });
  }

  try {
    return await response.json();
  } catch {
    throw new WebSearchError({
      code: 'invalid-response',
      message: `${options.provider} returned invalid JSON`,
      provider: options.provider,
      retryable: false,
      status: response.status
    });
  }
};
