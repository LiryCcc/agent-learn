import { webSearchProviderSchema } from '@liry-a/web-search-core';
import { z } from 'zod';

export const browserWebSearchConfigSchema = z
  .discriminatedUnion('enabled', [
    z.object({ enabled: z.literal(false) }),
    z.object({
      enabled: z.literal(true),
      apiKey: z.string().trim().min(1, 'Web search API Key is required.'),
      provider: webSearchProviderSchema
    })
  ])
  .default({ enabled: false });

export const browserAgentConfigSchema = z.object({
  apiKey: z.string().trim().min(1, 'API Key is required.'),
  baseUrl: z.url('Base URL must be a valid URL.'),
  deepThinking: z.boolean().default(false),
  model: z.string().trim().min(1, 'Model name is required.'),
  streamingEnabled: z.boolean().default(false),
  webSearch: browserWebSearchConfigSchema
});

export type BrowserWebSearchConfig = z.infer<typeof browserWebSearchConfigSchema>;
export type BrowserAgentConfig = z.infer<typeof browserAgentConfigSchema>;
