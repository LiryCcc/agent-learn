import { describe, expect, it } from 'vitest';
import { browserAgentConfigSchema } from './browser-agent-config.js';

describe('browser agent config', () => {
  it('disables optional features by default', () => {
    const config = browserAgentConfigSchema.parse({
      apiKey: 'test-key',
      baseUrl: 'https://example.com/v1',
      model: 'test-model'
    });

    expect(config.streamingEnabled).toBe(false);
    expect(config.webSearch).toEqual({ enabled: false });
  });

  it('requires an API key when web search is enabled', () => {
    const result = browserAgentConfigSchema.safeParse({
      apiKey: 'test-key',
      baseUrl: 'https://example.com/v1',
      model: 'test-model',
      webSearch: { enabled: true, provider: 'tavily' }
    });

    expect(result.success).toBe(false);
  });

  it('accepts an enabled web search provider', () => {
    const config = browserAgentConfigSchema.parse({
      apiKey: 'test-key',
      baseUrl: 'https://example.com/v1',
      model: 'test-model',
      webSearch: { apiKey: 'search-key', enabled: true, provider: 'serpapi' }
    });

    expect(config.webSearch).toEqual({ apiKey: 'search-key', enabled: true, provider: 'serpapi' });
  });
});
