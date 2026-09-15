import { z } from 'zod';

export const browserAgentConfigSchema = z.object({
  apiKey: z.string().trim().min(1, 'API Key is required.'),
  baseUrl: z.url('Base URL must be a valid URL.'),
  model: z.string().trim().min(1, 'Model name is required.')
});

export type BrowserAgentConfig = z.infer<typeof browserAgentConfigSchema>;
