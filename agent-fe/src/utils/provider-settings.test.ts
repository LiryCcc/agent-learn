import { describe, expect, it } from 'vitest';
import { PROVIDER_SETTINGS_ID, providerSettingsSchema } from './provider-settings.js';

describe('provider settings', () => {
  it('migrates saved settings with token streaming disabled', () => {
    const settings = providerSettingsSchema.parse({
      apiKey: 'test-key',
      baseUrl: 'https://example.com/v1',
      id: PROVIDER_SETTINGS_ID,
      model: 'test-model'
    });

    expect(settings.streamingEnabled).toBe(false);
  });
});
