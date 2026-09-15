import { useLiveQuery } from '@tanstack/solid-db';
import { Show, createEffect, createSignal } from 'solid-js';
import {
  PROVIDER_SETTINGS_ID,
  clearProviderSettings,
  defaultProviderSettings,
  providerSettingsCollection,
  providerSettingsSchema,
  saveProviderSettings
} from '@/utils/provider-settings.js';
import styles from './index.module.css';

const SettingsPage = () => {
  const settingsQuery = useLiveQuery((query) => query.from({ settings: providerSettingsCollection }));
  const [apiKey, setApiKey] = createSignal(defaultProviderSettings.apiKey);
  const [baseUrl, setBaseUrl] = createSignal(defaultProviderSettings.baseUrl);
  const [model, setModel] = createSignal(defaultProviderSettings.model);
  const [error, setError] = createSignal('');
  const [saved, setSaved] = createSignal(false);
  let loadedSavedSettings = false;

  createEffect(() => {
    const currentSettings = settingsQuery()[0];

    if (!currentSettings || loadedSavedSettings) {
      return;
    }

    setApiKey(currentSettings.apiKey);
    setBaseUrl(currentSettings.baseUrl);
    setModel(currentSettings.model);
    loadedSavedSettings = true;
  });

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    setError('');
    setSaved(false);

    const result = providerSettingsSchema.safeParse({
      id: PROVIDER_SETTINGS_ID,
      apiKey: apiKey(),
      baseUrl: baseUrl(),
      model: model()
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? '配置无效。');
      return;
    }

    saveProviderSettings(result.data);
    setSaved(true);
  };

  const handleClear = () => {
    clearProviderSettings();
    setApiKey(defaultProviderSettings.apiKey);
    setBaseUrl(defaultProviderSettings.baseUrl);
    setModel(defaultProviderSettings.model);
    setError('');
    setSaved(false);
    loadedSavedSettings = false;
  };

  return (
    <main class={styles['page']}>
      <section class={styles['hero']}>
        <p class={styles['eyebrow']}>{'TANSTACK DB · LOCAL STORAGE'}</p>
        <h1>{'模型设置'}</h1>
        <p>{'这些配置只用于在当前浏览器中创建 Agent。'}</p>
      </section>

      <section class={styles['card']}>
        <div class={styles['security-warning']}>
          <strong>{'注意：API Key 将以明文保存在 localStorage。'}</strong>
          <p>{'仅在个人可信设备上使用，不要填写应用或团队共享的长期密钥。'}</p>
        </div>

        <form class={styles['form']} onSubmit={handleSubmit}>
          <label>
            <span>{'API Key'}</span>
            <input
              autocomplete='new-password'
              onInput={(event) => setApiKey(event.currentTarget.value)}
              placeholder='sk-...'
              type='password'
              value={apiKey()}
            />
          </label>

          <label>
            <span>{'Base URL'}</span>
            <input
              inputmode='url'
              onInput={(event) => setBaseUrl(event.currentTarget.value)}
              placeholder='https://api.openai.com/v1'
              type='url'
              value={baseUrl()}
            />
          </label>

          <label>
            <span>{'模型名'}</span>
            <input
              onInput={(event) => setModel(event.currentTarget.value)}
              placeholder='gpt-4o-mini'
              type='text'
              value={model()}
            />
          </label>

          <Show when={error()}>
            <p class={styles['error']}>{error()}</p>
          </Show>
          <Show when={saved()}>
            <p class={styles['success']}>{'设置已保存，并已同步到 TanStack DB。'}</p>
          </Show>

          <div class={styles['actions']}>
            <button class={styles['primary-button']} type='submit'>
              {'保存设置'}
            </button>
            <button class={styles['danger-button']} type='button' onClick={handleClear}>
              {'删除本地设置'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default SettingsPage;
