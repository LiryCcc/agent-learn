import { z } from 'zod';

import { createEndpointUrl, requestJson } from '../http-client.js';
import type { ParsedWebSearchInput, WebSearchResponse, WebSearchResult } from '../web-search-schema.js';
import type { ExaSearchConfig } from '../web-search-types.js';
import { getUrlSource, hasValidResultUrl, parseProviderResponse } from './adapter-utils.js';

const exaResponseSchema = z.object({
  results: z.array(
    z.object({
      title: z.string().nullish(),
      url: z.string(),
      publishedDate: z.string().nullish(),
      author: z.string().nullish(),
      highlights: z.array(z.string()).nullish(),
      text: z.string().nullish(),
      score: z.number().nullish()
    })
  )
});

export const searchExa = async (input: ParsedWebSearchInput, config: ExaSearchConfig): Promise<WebSearchResponse> => {
  const endpoint = createEndpointUrl('exa', config.baseUrl ?? 'https://api.exa.ai/search');
  const payload = await requestJson({
    fetch: config.fetch,
    init: {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      },
      body: JSON.stringify({
        query: input.query,
        numResults: input.maxResults,
        type: config.searchType ?? 'auto',
        category: config.category,
        includeDomains: config.includeDomains,
        excludeDomains: config.excludeDomains,
        userLocation: config.userLocation,
        moderation: config.moderation,
        contents: { highlights: true }
      })
    },
    provider: 'exa',
    signal: config.signal,
    timeoutMs: config.timeoutMs,
    url: endpoint
  });
  const response = parseProviderResponse('exa', exaResponseSchema, payload);
  const results: WebSearchResult[] = response.results
    .map((result) => {
      const snippet = result.highlights?.join('\n\n') || result.text || '';
      const source = result.author ?? getUrlSource(result.url);

      return {
        title: result.title ?? result.url,
        url: result.url,
        snippet,
        ...(result.publishedDate ? { publishedAt: result.publishedDate } : {}),
        ...(result.score == null ? {} : { score: result.score }),
        ...(source ? { source } : {})
      };
    })
    .filter(hasValidResultUrl);

  return { provider: 'exa', query: input.query, results };
};
