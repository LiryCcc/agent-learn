import { WebSearchError, webSearch, type WebSearchConfig, type WebSearchProvider } from '@liry-a/web-search-core';

type ValidateWebSearchConnectionInput = {
  apiKey: string;
  provider: WebSearchProvider;
  signal?: AbortSignal;
};

export type ValidateWebSearchConnectionResult = {
  resultCount: number;
};

const createSearchConfig = ({ apiKey, provider, signal }: ValidateWebSearchConnectionInput): WebSearchConfig => {
  const sharedConfig = signal ? { apiKey, signal } : { apiKey };

  switch (provider) {
    case 'tavily':
      return { provider: 'tavily', ...sharedConfig };
    case 'brave':
      return { provider: 'brave', ...sharedConfig };
    case 'exa':
      return { provider: 'exa', ...sharedConfig };
    case 'serpapi':
      return { provider: 'serpapi', ...sharedConfig };
  }
};

export const validateWebSearchConnection = async (
  input: ValidateWebSearchConnectionInput
): Promise<ValidateWebSearchConnectionResult> => {
  const response = await webSearch(
    {
      query: 'OpenAI official website',
      maxResults: 1
    },
    createSearchConfig(input)
  );

  return { resultCount: response.results.length };
};

export const getWebSearchValidationErrorMessage = (error: unknown): string => {
  if (!(error instanceof WebSearchError)) {
    return '校验失败，请稍后重试。';
  }

  switch (error.code) {
    case 'authentication':
      return 'API Key 无效或没有访问该搜索服务的权限。';
    case 'rate-limit':
      return '搜索额度或请求频率已达到限制。';
    case 'timeout':
      return '搜索服务响应超时，请稍后重试。';
    case 'network':
      return '无法连接搜索服务；该供应商也可能不允许浏览器跨域调用。';
    case 'aborted':
      return '校验已取消。';
    case 'invalid-configuration':
      return '联网搜索配置无效。';
    case 'invalid-response':
      return '搜索服务返回了无法识别的数据。';
    case 'upstream':
      return '搜索供应商拒绝或未能完成这次校验请求。';
  }
};
