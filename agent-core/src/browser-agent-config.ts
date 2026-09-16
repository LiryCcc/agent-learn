import { z } from 'zod';

export const browserAgentConfigSchema = z.object({
  apiKey: z.string().trim().min(1, 'API Key is required.'),
  baseUrl: z.url('Base URL must be a valid URL.'),
  deepThinking: z.boolean().default(false),
  model: z.string().trim().min(1, 'Model name is required.'),
  streamingEnabled: z.boolean().default(false)
});

export type BrowserAgentConfig = z.infer<typeof browserAgentConfigSchema>;
