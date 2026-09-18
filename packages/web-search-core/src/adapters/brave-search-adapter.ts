import { z } from 'zod';

import { createEndpointUrl, requestJson } from '../http-client.js';
import type { ParsedWebSearchInput, WebSearchResponse, WebSearchResult } from '../web-search-schema.js';
import type { BraveSearchConfig } from '../web-search-types.js';
import { getUrlSource, hasValidResultUrl, parseProviderResponse } from './adapter-utils.js';

const braveResponseSchema = z.object({
  web: z
    .object({
      results: z.array(
        z.object({
          title: z.string(),
          url: z.string(),
          description: z.string().optional().default(''),
          page_age: z.string().nullish(),
          profile: z.object({ long_name: z.string().nullish() }).nullish()
        })
      )
    })
    .optional()
});

const setOptionalParameter = (url: URL, name: string, value: boolean | string | undefined): void => {
  if (value !== undefined) {
    url.searchParams.set(name, String(value));
  }
};

export const searchBrave = async (
  input: ParsedWebSearchInput,
  config: BraveSearchConfig
): Promise<WebSearchResponse> => {
  const endpoint = createEndpointUrl('brave', config.baseUrl ?? 'https://api.search.brave.com/res/v1/web/search');
  endpoint.searchParams.set('q', input.query);
  endpoint.searchParams.set('count', String(input.maxResults));
  setOptionalParameter(endpoint, 'country', config.country);
  setOptionalParameter(endpoint, 'search_lang', config.searchLanguage);
  setOptionalParameter(endpoint, 'ui_lang', config.uiLanguage);
  setOptionalParameter(endpoint, 'safesearch', config.safeSearch);
  setOptionalParameter(endpoint, 'freshness', config.freshness);
  setOptionalParameter(endpoint, 'extra_snippets', config.extraSnippets);

  const payload = await requestJson({
    fetch: config.fetch,
    init: {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': config.apiKey
      }
    },
    provider: 'brave',
    signal: config.signal,
    timeoutMs: config.timeoutMs,
    url: endpoint
  });
  const response = parseProviderResponse('brave', braveResponseSchema, payload);
  const results: WebSearchResult[] = (response.web?.results ?? [])
    .map((result) => {
      const source = result.profile?.long_name ?? getUrlSource(result.url);

      return {
        title: result.title,
        url: result.url,
        snippet: result.description,
        ...(result.page_age ? { publishedAt: result.page_age } : {}),
        ...(source ? { source } : {})
      };
    })
    .filter(hasValidResultUrl);

  return { provider: 'brave', query: input.query, results };
};
