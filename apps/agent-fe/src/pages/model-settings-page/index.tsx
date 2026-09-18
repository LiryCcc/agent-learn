import ControlledInput from '@/components/controlled-input/index.jsx';
import TokenStreamingSetting from '@/components/token-streaming-setting/index.jsx';
import { createObservabilityTraceId, recordObservabilityEvent } from '@/utils/observability-log.js';
import {
  clearProviderSettings,
  defaultProviderSettings,
  modelSettingsSchema,
  providerSettingsCollection,
  saveProviderSettings
} from '@/utils/provider-settings.js';
import { useLiveQuery } from '@tanstack/solid-db';
import { Show, createEffect, createSignal } from 'solid-js';
import styles from '../settings-page/index.module.css';

const ModelSettingsPage = () => {
  const settingsQuery = useLiveQuery((query) => query.from({ settings: providerSettingsCollection }));
  const [apiKey, setApiKey] = createSignal(defaultProviderSettings.apiKey);
  const [baseUrl, setBaseUrl] = createSignal(defaultProviderSettings.baseUrl);
  const [model, setModel] = createSignal(defaultProviderSettings.model);
  const [streamingEnabled, setStreamingEnabled] = createSignal(defaultProviderSettings.streamingEnabled);
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
    setStreamingEnabled(currentSettings.streamingEnabled);
    loadedSavedSettings = true;
  });

  const handleSave = () => {
    setError('');
    setSaved(false);

    const result = modelSettingsSchema.safeParse({
      apiKey: apiKey(),
      baseUrl: baseUrl(),
      model: model(),
      streamingEnabled: streamingEnabled()
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? '配置无效。');
      recordObservabilityEvent({
        details: {
          issueCount: result.error.issues.length,
          issues: result.error.issues.map((issue) => ({ code: issue.code, path: issue.path }))
        },
        event: 'settings.model.validation.failed',
        level: 'warn',
        scope: 'settings',
        traceId: createObservabilityTraceId('settings')
      });
      return;
    }

    const currentSettings = settingsQuery()[0] ?? defaultProviderSettings;

    saveProviderSettings({ ...currentSettings, ...result.data });
    setSaved(true);
    recordObservabilityEvent({
      details: {
        baseUrl: result.data.baseUrl,
        hasApiKey: result.data.apiKey.length > 0,
        model: result.data.model,
        streamingEnabled: result.data.streamingEnabled
      },
      event: 'settings.model.saved',
      scope: 'settings',
      traceId: createObservabilityTraceId('settings')
    });
  };

  const handleClear = () => {
    clearProviderSettings();
    setApiKey(defaultProviderSettings.apiKey);
    setBaseUrl(defaultProviderSettings.baseUrl);
    setModel(defaultProviderSettings.model);
    setStreamingEnabled(defaultProviderSettings.streamingEnabled);
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
    <div class={styles['settings-fields']}>
      <section class={styles['settings-group']}>
        <div class={styles['group-heading']}>
          <strong>{'模型服务'}</strong>
          <span>{'配置 OpenAI 兼容的模型接口与输出方式。'}</span>
        </div>

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

        <TokenStreamingSetting checked={streamingEnabled()} onChange={setStreamingEnabled} />
      </section>

      <Show when={error()}>
        <p class={styles['error']}>{error()}</p>
      </Show>
      <Show when={saved()}>
        <p class={styles['success']}>{'模型设置已保存。'}</p>
      </Show>

      <div class={styles['actions']}>
        <button class={styles['primary-button']} type='button' onClick={handleSave}>
          {'保存模型设置'}
        </button>
        <button class={styles['danger-button']} type='button' onClick={handleClear}>
          {'删除全部本地设置'}
        </button>
      </div>
    </div>
  );
};

export default ModelSettingsPage;
