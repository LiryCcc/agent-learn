import { createCollection, localStorageCollectionOptions } from '@tanstack/solid-db';
import { z } from 'zod';

export const PROVIDER_SETTINGS_ID = 'default';

export const providerSettingsSchema = z.object({
  id: z.literal(PROVIDER_SETTINGS_ID),
  apiKey: z.string().trim().min(1, '请输入 API Key。'),
  baseUrl: z.url('请输入有效的 Base URL。'),
  model: z.string().trim().min(1, '请输入模型名。'),
  streamingEnabled: z.boolean().default(false)
});

export type ProviderSettings = z.infer<typeof providerSettingsSchema>;

export const defaultProviderSettings: ProviderSettings = {
  id: PROVIDER_SETTINGS_ID,
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  streamingEnabled: false
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
