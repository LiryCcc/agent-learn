import { z } from 'zod';

import { WebSearchError } from '../web-search-error.js';
import type { WebSearchResult } from '../web-search-schema.js';
import type { WebSearchProvider } from '../web-search-types.js';

export const parseProviderResponse = <T>(provider: WebSearchProvider, schema: z.ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new WebSearchError({
      code: 'invalid-response',
      message: `${provider} returned an unexpected response shape`,
      provider,
      retryable: false
    });
  }

  return parsed.data;
};

export const getUrlSource = (url: string): string | undefined => {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
};

export const hasValidResultUrl = (result: WebSearchResult): boolean => {
  return z.url().safeParse(result.url).success;
};
