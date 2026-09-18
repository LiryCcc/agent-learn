import { z } from 'zod';

import { createEndpointUrl, requestJson } from '../http-client.js';
import { WebSearchError } from '../web-search-error.js';
import type { ParsedWebSearchInput, WebSearchResponse, WebSearchResult } from '../web-search-schema.js';
import type { SerpApiSearchConfig } from '../web-search-types.js';
import { getUrlSource, hasValidResultUrl, parseProviderResponse } from './adapter-utils.js';

const serpApiResponseSchema = z.object({
  error: z.string().optional(),
  organic_results: z
    .array(
      z.object({
        title: z.string(),
        link: z.string(),
        snippet: z.string().optional().default(''),
        date: z.string().nullish(),
        source: z.string().nullish(),
        displayed_link: z.string().nullish()
      })
    )
    .optional()
});

const setOptionalParameter = (url: URL, name: string, value: string | undefined): void => {
  if (value !== undefined) {
    url.searchParams.set(name, value);
  }
};

export const searchSerpApi = async (
  input: ParsedWebSearchInput,
  config: SerpApiSearchConfig
): Promise<WebSearchResponse> => {
  const endpoint = createEndpointUrl('serpapi', config.baseUrl ?? 'https://serpapi.com/search.json');
  endpoint.searchParams.set('engine', config.engine ?? 'google');
  endpoint.searchParams.set('q', input.query);
  endpoint.searchParams.set('api_key', config.apiKey);
  endpoint.searchParams.set('num', String(input.maxResults));
  endpoint.searchParams.set('output', 'json');
  setOptionalParameter(endpoint, 'location', config.location);
  setOptionalParameter(endpoint, 'gl', config.country);
  setOptionalParameter(endpoint, 'hl', config.language);
  setOptionalParameter(endpoint, 'safe', config.safeSearch);

  const payload = await requestJson({
    fetch: config.fetch,
    init: {
      method: 'GET',
      headers: { Accept: 'application/json' }
    },
    provider: 'serpapi',
    signal: config.signal,
    timeoutMs: config.timeoutMs,
    url: endpoint
  });
  const response = parseProviderResponse('serpapi', serpApiResponseSchema, payload);

  if (response.error) {
    throw new WebSearchError({
      code: 'upstream',
      message: 'serpapi reported a search error',
      provider: 'serpapi',
      retryable: false
    });
  }

  const results: WebSearchResult[] = (response.organic_results ?? [])
    .map((result) => {
      const source = result.source ?? result.displayed_link ?? getUrlSource(result.link);

      return {
        title: result.title,
        url: result.link,
        snippet: result.snippet,
        ...(result.date ? { publishedAt: result.date } : {}),
        ...(source ? { source } : {})
      };
    })
    .filter(hasValidResultUrl);

  return { provider: 'serpapi', query: input.query, results };
};
