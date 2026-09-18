import { describe, expect, it } from 'vitest';
import {
  PROVIDER_SETTINGS_ID,
  modelSettingsSchema,
  providerSettingsSchema,
  webSearchProviderOptions,
  webSearchSettingsSchema
} from './provider-settings.js';

describe('provider settings', () => {
  it('migrates saved settings with optional features disabled', () => {
    const settings = providerSettingsSchema.parse({
      apiKey: 'test-key',
      baseUrl: 'https://example.com/v1',
      id: PROVIDER_SETTINGS_ID,
      model: 'test-model'
    });

    expect(settings.streamingEnabled).toBe(false);
    expect(settings.webSearchEnabled).toBe(false);
    expect(settings.webSearchProvider).toBe('tavily');
    expect(settings.webSearchApiKey).toBe('');
  });

  it('requires a search API key when web search is enabled', () => {
    const result = providerSettingsSchema.safeParse({
      apiKey: 'test-key',
      baseUrl: 'https://example.com/v1',
      id: PROVIDER_SETTINGS_ID,
      model: 'test-model',
      webSearchEnabled: true,
      webSearchProvider: 'exa'
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['webSearchApiKey']);
  });

  it('accepts an enabled web search provider with an API key', () => {
    const settings = providerSettingsSchema.parse({
      apiKey: 'test-key',
      baseUrl: 'https://example.com/v1',
      id: PROVIDER_SETTINGS_ID,
      model: 'test-model',
      webSearchApiKey: 'search-key',
      webSearchEnabled: true,
      webSearchProvider: 'brave'
    });

    expect(settings.webSearchEnabled).toBe(true);
    expect(settings.webSearchProvider).toBe('brave');
  });

  it('provides an HTTPS website for every search provider', () => {
    expect(webSearchProviderOptions).toHaveLength(4);
    expect(webSearchProviderOptions.every((provider) => provider.websiteUrl.startsWith('https://'))).toBe(true);
  });

  it('validates model and web search tabs independently', () => {
    expect(
      modelSettingsSchema.safeParse({
        apiKey: '',
        baseUrl: 'https://example.com/v1',
        model: 'test-model',
        streamingEnabled: false
      }).success
    ).toBe(false);
    expect(
      webSearchSettingsSchema.safeParse({
        webSearchApiKey: 'search-key',
        webSearchEnabled: true,
        webSearchProvider: 'exa'
      }).success
    ).toBe(true);
  });

  it('allows web search settings to be stored before model credentials are configured', () => {
    const settings = providerSettingsSchema.parse({
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      id: PROVIDER_SETTINGS_ID,
      model: 'gpt-4o-mini',
      webSearchApiKey: 'search-key',
      webSearchEnabled: true,
      webSearchProvider: 'tavily'
    });

    expect(settings.apiKey).toBe('');
    expect(settings.webSearchEnabled).toBe(true);
  });
});
