import { searchBrave } from './adapters/brave-search-adapter.js';
import { searchExa } from './adapters/exa-adapter.js';
import { searchSerpApi } from './adapters/serp-api-adapter.js';
import { searchTavily } from './adapters/tavily-adapter.js';
import { WebSearchError } from './web-search-error.js';
import {
  webSearchResponseSchema,
  webSearchSchema,
  type WebSearchInput,
  type WebSearchResponse
} from './web-search-schema.js';
import type { WebSearchConfig } from './web-search-types.js';

const validateConfig = (config: WebSearchConfig): void => {
  if (config.apiKey.trim().length === 0) {
    throw new WebSearchError({
      code: 'invalid-configuration',
      message: `${config.provider} API key must not be empty`,
      provider: config.provider,
      retryable: false
    });
  }

  if (config.timeoutMs !== undefined && (!Number.isFinite(config.timeoutMs) || config.timeoutMs <= 0)) {
    throw new WebSearchError({
      code: 'invalid-configuration',
      message: `${config.provider} timeout must be a positive number`,
      provider: config.provider,
      retryable: false
    });
  }
};

export const webSearch = async (input: WebSearchInput, config: WebSearchConfig): Promise<WebSearchResponse> => {
  const parsedInput = webSearchSchema.parse(input);
  validateConfig(config);

  const response = await (async () => {
    switch (config.provider) {
      case 'tavily':
        return searchTavily(parsedInput, config);
      case 'brave':
        return searchBrave(parsedInput, config);
      case 'exa':
        return searchExa(parsedInput, config);
      case 'serpapi':
        return searchSerpApi(parsedInput, config);
    }
  })();

  return webSearchResponseSchema.parse(response);
};
