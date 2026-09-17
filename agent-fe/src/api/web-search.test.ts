import { WebSearchError } from '@liry-a/web-search-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getWebSearchValidationErrorMessage, validateWebSearchConnection } from './web-search.js';

// cspell:ignore unstub
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('web search validation', () => {
  it('sends a minimal real search request', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            results: [
              {
                content: 'Official website',
                title: 'OpenAI',
                url: 'https://openai.com'
              }
            ]
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await validateWebSearchConnection({ apiKey: 'test-key', provider: 'tavily' });

    expect(result).toEqual({ resultCount: 1 });
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const requestBody = requestInit?.body;

    expect(requestInit?.method).toBe('POST');
    expect(typeof requestBody).toBe('string');

    if (typeof requestBody !== 'string') {
      throw new Error('Expected the web search request body to be a string.');
    }

    expect(JSON.parse(requestBody)).toMatchObject({ max_results: 1 });
  });

  it('maps authentication errors to a user-facing message', () => {
    const error = new WebSearchError({
      code: 'authentication',
      message: 'authentication failed',
      provider: 'exa',
      retryable: false,
      status: 401
    });

    expect(getWebSearchValidationErrorMessage(error)).toBe('API Key 无效或没有访问该搜索服务的权限。');
  });
});
