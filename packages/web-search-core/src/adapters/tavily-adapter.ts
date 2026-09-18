import { z } from 'zod';

import { createEndpointUrl, requestJson } from '../http-client.js';
import type { ParsedWebSearchInput, WebSearchResponse, WebSearchResult } from '../web-search-schema.js';
import type { TavilySearchConfig } from '../web-search-types.js';
import { getUrlSource, hasValidResultUrl, parseProviderResponse } from './adapter-utils.js';

const tavilyResponseSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      content: z.string().optional().default(''),
      published_date: z.string().nullish(),
      score: z.number().nullish()
    })
  )
});

export const searchTavily = async (
  input: ParsedWebSearchInput,
  config: TavilySearchConfig
): Promise<WebSearchResponse> => {
  const endpoint = createEndpointUrl('tavily', config.baseUrl ?? 'https://api.tavily.com/search');
  const payload = await requestJson({
    fetch: config.fetch,
    init: {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: input.query,
        max_results: input.maxResults,
        search_depth: config.searchDepth ?? 'basic',
        topic: config.topic ?? 'general',
        include_answer: false,
        include_raw_content: false,
        include_domains: config.includeDomains,
        exclude_domains: config.excludeDomains,
        country: config.country
      })
    },
    provider: 'tavily',
    signal: config.signal,
    timeoutMs: config.timeoutMs,
    url: endpoint
  });
  const response = parseProviderResponse('tavily', tavilyResponseSchema, payload);
  const results: WebSearchResult[] = response.results
    .map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
      ...(result.published_date ? { publishedAt: result.published_date } : {}),
      ...(result.score == null ? {} : { score: result.score }),
      ...(getUrlSource(result.url) ? { source: getUrlSource(result.url) } : {})
    }))
    .filter(hasValidResultUrl);

  return { provider: 'tavily', query: input.query, results };
};
