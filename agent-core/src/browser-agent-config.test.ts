import { describe, expect, it } from 'vitest';
import { browserAgentConfigSchema } from './browser-agent-config.js';

describe('browser agent config', () => {
  it('disables token streaming by default', () => {
    const config = browserAgentConfigSchema.parse({
      apiKey: 'test-key',
      baseUrl: 'https://example.com/v1',
      model: 'test-model'
    });

    expect(config.streamingEnabled).toBe(false);
  });
});
