import { WebSearchError } from '@liry-a/web-search-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getWebSearchValidationErrorMessage, validateWebSearchConnection } from './web-search.js';

// cspell:ignore unstub
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('web search validation', () => {
  it('sends a minimal real search request', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
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
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await validateWebSearchConnection({ apiKey: 'test-key', provider: 'tavily' });

    expect(result).toEqual({ resultCount: 1 });
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestInit?.method).toBe('POST');
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({ max_results: 1 });
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
