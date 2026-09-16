import ControlledInput from '@/components/controlled-input/index.jsx';
import { createObservabilityTraceId, recordObservabilityEvent } from '@/utils/observability-log.js';
import {
  PROVIDER_SETTINGS_ID,
  clearProviderSettings,
  defaultProviderSettings,
  providerSettingsCollection,
  providerSettingsSchema,
  saveProviderSettings
} from '@/utils/provider-settings.js';
import { useLiveQuery } from '@tanstack/solid-db';
import { Show, createEffect, createSignal } from 'solid-js';
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

  const handleSave = () => {
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
      recordObservabilityEvent({
        details: {
          issueCount: result.error.issues.length,
          issues: result.error.issues.map((issue) => ({ code: issue.code, path: issue.path }))
        },
        event: 'settings.validation.failed',
        level: 'warn',
        scope: 'settings',
        traceId: createObservabilityTraceId('settings')
      });
      return;
    }

    saveProviderSettings(result.data);
    setSaved(true);
    recordObservabilityEvent({
      details: {
        baseUrl: result.data.baseUrl,
        hasApiKey: result.data.apiKey.length > 0,
        model: result.data.model
      },
      event: 'settings.saved',
      scope: 'settings',
      traceId: createObservabilityTraceId('settings')
    });
  };

  const handleClear = () => {
    clearProviderSettings();
    setApiKey(defaultProviderSettings.apiKey);
    setBaseUrl(defaultProviderSettings.baseUrl);
    setModel(defaultProviderSettings.model);
    setError('');
    setSaved(false);
    loadedSavedSettings = false;
    recordObservabilityEvent({
      event: 'settings.cleared',
      scope: 'settings',
      traceId: createObservabilityTraceId('settings')
    });
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

        <div class={styles['settings-fields']}>
          <ControlledInput
            autocomplete='off'
            label='API Key'
            name='api-key'
            onValueChange={setApiKey}
            placeholder='sk-...'
            type='password'
            value={apiKey()}
          />

          <ControlledInput
            autocomplete='url'
            inputmode='url'
            label='Base URL'
            name='base-url'
            onValueChange={setBaseUrl}
            placeholder='https://api.openai.com/v1'
            type='url'
            value={baseUrl()}
          />

          <ControlledInput
            autocomplete='off'
            label='模型名'
            name='model'
            onValueChange={setModel}
            placeholder='gpt-4o-mini'
            type='text'
            value={model()}
          />

          <Show when={error()}>
            <p class={styles['error']}>{error()}</p>
          </Show>
          <Show when={saved()}>
            <p class={styles['success']}>{'设置已保存，并已同步到 TanStack DB。'}</p>
          </Show>

          <div class={styles['actions']}>
            <button class={styles['primary-button']} type='button' onClick={handleSave}>
              {'保存设置'}
            </button>
            <button class={styles['danger-button']} type='button' onClick={handleClear}>
              {'删除本地设置'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default SettingsPage;
