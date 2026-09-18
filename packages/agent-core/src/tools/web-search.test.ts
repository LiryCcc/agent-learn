import { describe, expect, it, vi } from 'vitest';
import { createWebSearchTool } from './web-search.js';

describe('web search tool', () => {
  it('registers the expected name and returns normalized search data', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            results: [
              {
                content: 'Current result',
                title: 'Example result',
                url: 'https://example.com/result'
              }
            ]
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )
      )
    );
    const webSearchTool = createWebSearchTool({
      apiKey: 'test-key',
      fetch: fetchMock,
      provider: 'tavily'
    });

    const result = await webSearchTool.invoke({ maxResults: 1, query: 'current example' });

    expect(webSearchTool.name).toBe('web_search');
    expect(result).toMatchObject({
      provider: 'tavily',
      query: 'current example',
      results: [{ title: 'Example result', url: 'https://example.com/result' }]
    });
  });
});
