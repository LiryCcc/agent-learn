import { describe, expect, it, vi } from 'vitest';

import { WebSearchError } from './web-search-error.js';
import { webSearchSchema } from './web-search-schema.js';
import { webSearch } from './web-search.js';

const jsonResponse = (body: unknown, status = 200): Response => {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status
  });
};

const getRequestBody = (init: RequestInit | undefined): Record<string, unknown> => {
  if (typeof init?.body !== 'string') {
    throw new Error('Expected a JSON string request body');
  }

  return JSON.parse(init.body) as Record<string, unknown>;
};

describe('webSearchSchema', () => {
  it('trims the query and supplies the default result count', () => {
    expect(webSearchSchema.parse({ query: '  current AI news  ' })).toEqual({
      query: 'current AI news',
      maxResults: 5
    });
  });

  it('rejects empty queries and excessive result counts', () => {
    expect(() => webSearchSchema.parse({ query: ' ' })).toThrow();
    expect(() => webSearchSchema.parse({ query: 'news', maxResults: 21 })).toThrow();
  });
});

describe('webSearch', () => {
  it('calls Tavily and normalizes its results', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      jsonResponse({
        results: [
          {
            title: 'Tavily result',
            url: 'https://example.com/tavily',
            content: 'Tavily summary',
            score: 0.91,
            published_date: '2026-09-17'
          }
        ]
      })
    );

    const response = await webSearch(
      { query: 'Tavily query', maxResults: 3 },
      { provider: 'tavily', apiKey: 'tavily-secret', fetch: fetchMock }
    );

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(String(requestUrl)).toBe('https://api.tavily.com/search');
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.headers).toMatchObject({ Authorization: 'Bearer tavily-secret' });
    expect(getRequestBody(requestInit)).toMatchObject({
      query: 'Tavily query',
      max_results: 3,
      search_depth: 'basic',
      topic: 'general'
    });
    expect(response).toEqual({
      provider: 'tavily',
      query: 'Tavily query',
      results: [
        {
          title: 'Tavily result',
          url: 'https://example.com/tavily',
          snippet: 'Tavily summary',
          publishedAt: '2026-09-17',
          score: 0.91,
          source: 'example.com'
        }
      ]
    });
  });

  it('calls Brave Search and normalizes its results', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      jsonResponse({
        web: {
          results: [
            {
              title: 'Brave result',
              url: 'https://brave.example/result',
              description: 'Brave summary',
              page_age: '2026-09-16T00:00:00Z',
              profile: { long_name: 'Brave Example' }
            }
          ]
        }
      })
    );

    const response = await webSearch(
      { query: 'Brave query', maxResults: 7 },
      {
        provider: 'brave',
        apiKey: 'brave-secret',
        fetch: fetchMock,
        country: 'US',
        searchLanguage: 'en',
        safeSearch: 'strict'
      }
    );

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    const url = new URL(String(requestUrl));
    expect(url.searchParams.get('q')).toBe('Brave query');
    expect(url.searchParams.get('count')).toBe('7');
    expect(url.searchParams.get('country')).toBe('US');
    expect(url.searchParams.get('search_lang')).toBe('en');
    expect(url.searchParams.get('safesearch')).toBe('strict');
    expect(requestInit?.headers).toMatchObject({ 'X-Subscription-Token': 'brave-secret' });
    expect(response.results[0]).toEqual({
      title: 'Brave result',
      url: 'https://brave.example/result',
      snippet: 'Brave summary',
      publishedAt: '2026-09-16T00:00:00Z',
      source: 'Brave Example'
    });
  });

  it('calls Exa with highlights and normalizes its results', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      jsonResponse({
        results: [
          {
            title: 'Exa result',
            url: 'https://exa.example/result',
            highlights: ['First highlight', 'Second highlight'],
            publishedDate: '2026-09-15T00:00:00Z',
            author: 'Example Author'
          }
        ]
      })
    );

    const response = await webSearch(
      { query: 'Exa query', maxResults: 4 },
      {
        provider: 'exa',
        apiKey: 'exa-secret',
        fetch: fetchMock,
        searchType: 'fast',
        category: 'news'
      }
    );

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestInit?.headers).toMatchObject({ 'x-api-key': 'exa-secret' });
    expect(getRequestBody(requestInit)).toMatchObject({
      query: 'Exa query',
      numResults: 4,
      type: 'fast',
      category: 'news',
      contents: { highlights: true }
    });
    expect(response.results[0]).toEqual({
      title: 'Exa result',
      url: 'https://exa.example/result',
      snippet: 'First highlight\n\nSecond highlight',
      publishedAt: '2026-09-15T00:00:00Z',
      source: 'Example Author'
    });
  });

  it('calls SerpAPI and normalizes organic results', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      jsonResponse({
        organic_results: [
          {
            title: 'SerpAPI result',
            link: 'https://serp.example/result',
            snippet: 'SerpAPI summary',
            date: 'Sep 17, 2026',
            source: 'Serp Example'
          }
        ]
      })
    );

    const response = await webSearch(
      { query: 'SerpAPI query', maxResults: 8 },
      {
        provider: 'serpapi',
        apiKey: 'serp-secret',
        fetch: fetchMock,
        country: 'us',
        language: 'en'
      }
    );

    const [requestUrl] = fetchMock.mock.calls[0] ?? [];
    const url = new URL(String(requestUrl));
    expect(url.searchParams.get('engine')).toBe('google');
    expect(url.searchParams.get('q')).toBe('SerpAPI query');
    expect(url.searchParams.get('api_key')).toBe('serp-secret');
    expect(url.searchParams.get('num')).toBe('8');
    expect(url.searchParams.get('gl')).toBe('us');
    expect(url.searchParams.get('hl')).toBe('en');
    expect(response.results[0]).toEqual({
      title: 'SerpAPI result',
      url: 'https://serp.example/result',
      snippet: 'SerpAPI summary',
      publishedAt: 'Sep 17, 2026',
      source: 'Serp Example'
    });
  });

  it('returns a typed, retryable error for rate limits', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      jsonResponse({ error: 'rate limited' }, 429)
    );

    const request = webSearch(
      { query: 'limited query' },
      { provider: 'brave', apiKey: 'brave-secret', fetch: fetchMock }
    );

    await expect(request).rejects.toMatchObject({
      code: 'rate-limit',
      provider: 'brave',
      retryable: true,
      status: 429
    } satisfies Partial<WebSearchError>);
  });

  it('does not expose a SerpAPI key when the network request fails', async () => {
    const fetchMock = vi.fn(async (): Promise<Response> => {
      throw new Error('request containing serp-secret failed');
    });

    const request = webSearch(
      { query: 'private query' },
      { provider: 'serpapi', apiKey: 'serp-secret', fetch: fetchMock }
    );

    await expect(request).rejects.toMatchObject({
      message: 'serpapi search request failed',
      provider: 'serpapi'
    });
    await expect(request).rejects.not.toThrow('serp-secret');
  });

  it('rejects an empty API key before making a request', async () => {
    const fetchMock = vi.fn();

    const request = webSearch({ query: 'query' }, { provider: 'tavily', apiKey: ' ', fetch: fetchMock });

    await expect(request).rejects.toMatchObject({
      code: 'invalid-configuration',
      provider: 'tavily'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
