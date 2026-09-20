import { webSearchProviderSchema, type WebSearchProvider } from '@liry-a/web-search-core';
import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';
import { z } from 'zod';

export const PROVIDER_SETTINGS_ID = 'default';

export const webSearchProviderOptions: ReadonlyArray<{
  label: string;
  value: WebSearchProvider;
  websiteUrl: string;
}> = [
  { label: 'Tavily', value: 'tavily', websiteUrl: 'https://www.tavily.com/' },
  { label: 'Brave Search', value: 'brave', websiteUrl: 'https://brave.com/search/api/' },
  { label: 'Exa', value: 'exa', websiteUrl: 'https://exa.ai/' },
  { label: 'SerpAPI', value: 'serpapi', websiteUrl: 'https://serpapi.com/' }
];

export const modelSettingsSchema = z.object({
  apiKey: z.string().trim().min(1, '请输入 API Key。'),
  baseUrl: z.url('请输入有效的 Base URL。'),
  model: z.string().trim().min(1, '请输入模型名。'),
  streamingEnabled: z.boolean().default(false)
});

export const webSearchSettingsSchema = z
  .object({
    webSearchApiKey: z.string().trim().default(''),
    webSearchEnabled: z.boolean().default(false),
    webSearchProvider: webSearchProviderSchema.default('tavily')
  })
  .superRefine((settings, context) => {
    if (settings.webSearchEnabled && settings.webSearchApiKey.length === 0) {
      context.addIssue({
        code: 'custom',
        message: '开启联网搜索前，请输入搜索供应商 API Key。',
        path: ['webSearchApiKey']
      });
    }
  });

export const providerSettingsSchema = z
  .object({
    id: z.literal(PROVIDER_SETTINGS_ID),
    apiKey: z.string().trim().default(''),
    baseUrl: z.url('请输入有效的 Base URL。'),
    model: z.string().trim().min(1, '请输入模型名。'),
    streamingEnabled: z.boolean().default(false),
    webSearchApiKey: z.string().trim().default(''),
    webSearchEnabled: z.boolean().default(false),
    webSearchProvider: webSearchProviderSchema.default('tavily')
  })
  .superRefine((settings, context) => {
    if (settings.webSearchEnabled && settings.webSearchApiKey.length === 0) {
      context.addIssue({
        code: 'custom',
        message: '开启联网搜索前，请输入搜索供应商 API Key。',
        path: ['webSearchApiKey']
      });
    }
  });

export type ProviderSettings = z.infer<typeof providerSettingsSchema>;
export type ModelSettings = z.infer<typeof modelSettingsSchema>;
export type WebSearchSettings = z.infer<typeof webSearchSettingsSchema>;

export const defaultProviderSettings: ProviderSettings = {
  id: PROVIDER_SETTINGS_ID,
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  streamingEnabled: false,
  webSearchApiKey: '',
  webSearchEnabled: false,
  webSearchProvider: 'tavily'
};

export const providerSettingsCollection = createCollection(
  localStorageCollectionOptions({
    id: 'provider-settings',
    storageKey: 'liry-agent-provider-settings',
    getKey: (settings) => settings.id,
    schema: providerSettingsSchema
  })
);

export const saveProviderSettings = (settings: ProviderSettings) => {
  if (providerSettingsCollection.has(PROVIDER_SETTINGS_ID)) {
    providerSettingsCollection.update(PROVIDER_SETTINGS_ID, (draft) => {
      draft.apiKey = settings.apiKey;
      draft.baseUrl = settings.baseUrl;
      draft.model = settings.model;
      draft.streamingEnabled = settings.streamingEnabled;
      draft.webSearchApiKey = settings.webSearchApiKey;
      draft.webSearchEnabled = settings.webSearchEnabled;
      draft.webSearchProvider = settings.webSearchProvider;
    });
    return;
  }

  providerSettingsCollection.insert(settings);
};

export const clearProviderSettings = () => {
  if (providerSettingsCollection.has(PROVIDER_SETTINGS_ID)) {
    providerSettingsCollection.delete(PROVIDER_SETTINGS_ID);
  }
};
