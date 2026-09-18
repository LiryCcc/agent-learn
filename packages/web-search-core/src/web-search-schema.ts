import { z } from 'zod';

export const webSearchProviderSchema = z.enum(['tavily', 'brave', 'exa', 'serpapi']);

export const webSearchSchema = z
  .object({
    query: z.string().trim().min(1).max(600),
    maxResults: z.number().int().min(1).max(20).default(5)
  })
  .strict();

export const webSearchResultSchema = z
  .object({
    title: z.string(),
    url: z.url(),
    snippet: z.string(),
    publishedAt: z.string().optional(),
    score: z.number().optional(),
    source: z.string().optional()
  })
  .strict();

export const webSearchResponseSchema = z
  .object({
    provider: webSearchProviderSchema,
    query: z.string(),
    results: z.array(webSearchResultSchema)
  })
  .strict();

export type WebSearchInput = z.input<typeof webSearchSchema>;
export type WebSearchResult = z.output<typeof webSearchResultSchema>;
export type WebSearchResponse = z.output<typeof webSearchResponseSchema>;

export type ParsedWebSearchInput = z.output<typeof webSearchSchema>;
