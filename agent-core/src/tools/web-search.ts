import { webSearch, webSearchSchema, type WebSearchConfig } from '@liry-a/web-search-core';
import { tool } from 'langchain';

export const createWebSearchTool = (config: WebSearchConfig) => {
  return tool(
    async (input, runtime) => {
      const parsedInput = webSearchSchema.parse(input);
      const runtimeSignal: unknown = runtime.signal;
      const signal = runtimeSignal instanceof AbortSignal ? runtimeSignal : undefined;

      return webSearch(parsedInput, signal ? { ...config, signal } : config);
    },
    {
      name: 'web_search',
      description:
        'Search the public web for current or time-sensitive information. Returns normalized titles, URLs, snippets, publication dates, scores, and sources.',
      schema: webSearchSchema
    }
  );
};
