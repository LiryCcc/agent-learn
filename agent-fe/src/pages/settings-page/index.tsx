import { getWebSearchValidationErrorMessage, validateWebSearchConnection } from '@/api/web-search.js';
import ControlledInput from '@/components/controlled-input/index.jsx';
import TokenStreamingSetting from '@/components/token-streaming-setting/index.jsx';
import { createObservabilityTraceId, recordObservabilityEvent } from '@/utils/observability-log.js';
import {
  PROVIDER_SETTINGS_ID,
  clearProviderSettings,
  defaultProviderSettings,
  providerSettingsCollection,
  providerSettingsSchema,
  saveProviderSettings,
  webSearchProviderOptions
} from '@/utils/provider-settings.js';
import { useLiveQuery } from '@tanstack/solid-db';
import { For, Show, createEffect, createSignal } from 'solid-js';
import styles from './index.module.css';

type ValidationStatus = 'error' | 'idle' | 'success' | 'validating';

const SettingsPage = () => {
  const settingsQuery = useLiveQuery((query) => query.from({ settings: providerSettingsCollection }));
  const [apiKey, setApiKey] = createSignal(defaultProviderSettings.apiKey);
  const [baseUrl, setBaseUrl] = createSignal(defaultProviderSettings.baseUrl);
  const [model, setModel] = createSignal(defaultProviderSettings.model);
  const [streamingEnabled, setStreamingEnabled] = createSignal(defaultProviderSettings.streamingEnabled);
  const [webSearchApiKey, setWebSearchApiKey] = createSignal(defaultProviderSettings.webSearchApiKey);
  const [webSearchEnabled, setWebSearchEnabled] = createSignal(defaultProviderSettings.webSearchEnabled);
  const [webSearchProvider, setWebSearchProvider] = createSignal(defaultProviderSettings.webSearchProvider);
  const [validationMessage, setValidationMessage] = createSignal('');
  const [validationStatus, setValidationStatus] = createSignal<ValidationStatus>('idle');
  const [error, setError] = createSignal('');
  const [saved, setSaved] = createSignal(false);
  let loadedSavedSettings = false;

  const selectedWebSearchProvider = () => {
    return webSearchProviderOptions.find((option) => option.value === webSearchProvider());
  };

  createEffect(() => {
    const currentSettings = settingsQuery()[0];

    if (!currentSettings || loadedSavedSettings) {
      return;
    }

    setApiKey(currentSettings.apiKey);
    setBaseUrl(currentSettings.baseUrl);
    setModel(currentSettings.model);
    setStreamingEnabled(currentSettings.streamingEnabled);
    setWebSearchApiKey(currentSettings.webSearchApiKey);
    setWebSearchEnabled(currentSettings.webSearchEnabled);
    setWebSearchProvider(currentSettings.webSearchProvider);
    loadedSavedSettings = true;
  });

  const resetWebSearchValidation = () => {
    setValidationMessage('');
    setValidationStatus('idle');
  };

  const handleWebSearchApiKeyChange = (value: string) => {
    setWebSearchApiKey(value);
    resetWebSearchValidation();
  };

  const handleWebSearchEnabledChange = (enabled: boolean) => {
    setWebSearchEnabled(enabled);
    resetWebSearchValidation();
  };

  const handleWebSearchProviderChange = (value: string) => {
    const option = webSearchProviderOptions.find((candidate) => candidate.value === value);

    if (option) {
      setWebSearchProvider(option.value);
      resetWebSearchValidation();
    }
  };

  const handleWebSearchValidation = async () => {
    const apiKeyValue = webSearchApiKey().trim();
    const providerValue = webSearchProvider();
    const traceId = createObservabilityTraceId('settings');

    if (!apiKeyValue) {
      setValidationStatus('error');
      setValidationMessage('请先输入搜索供应商 API Key。');
      return;
    }

    setValidationStatus('validating');
    setValidationMessage('正在向搜索供应商发送校验请求…');
    recordObservabilityEvent({
      details: { provider: providerValue },
      event: 'settings.web-search.validation.started',
      scope: 'settings',
      traceId
    });

    try {
      const result = await validateWebSearchConnection({
        apiKey: apiKeyValue,
        provider: providerValue
      });

      setValidationStatus('success');
      setValidationMessage(`校验成功，搜索服务返回 ${result.resultCount} 条结果。`);
      recordObservabilityEvent({
        details: { provider: providerValue, resultCount: result.resultCount },
        event: 'settings.web-search.validation.completed',
        scope: 'settings',
        traceId
      });
    } catch (validationError) {
      const validationErrorMessage = getWebSearchValidationErrorMessage(validationError);

      setValidationStatus('error');
      setValidationMessage(validationErrorMessage);
      recordObservabilityEvent({
        details: {
          error: validationErrorMessage,
          provider: providerValue
        },
        event: 'settings.web-search.validation.failed',
        level: 'warn',
        scope: 'settings',
        traceId
      });
    }
  };

  const handleSave = () => {
    setError('');
    setSaved(false);

    const result = providerSettingsSchema.safeParse({
      id: PROVIDER_SETTINGS_ID,
      apiKey: apiKey(),
      baseUrl: baseUrl(),
      model: model(),
      streamingEnabled: streamingEnabled(),
      webSearchApiKey: webSearchApiKey(),
      webSearchEnabled: webSearchEnabled(),
      webSearchProvider: webSearchProvider()
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
        model: result.data.model,
        streamingEnabled: result.data.streamingEnabled,
        hasWebSearchApiKey: result.data.webSearchApiKey.length > 0,
        webSearchEnabled: result.data.webSearchEnabled,
        webSearchProvider: result.data.webSearchProvider
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
    setStreamingEnabled(defaultProviderSettings.streamingEnabled);
    setWebSearchApiKey(defaultProviderSettings.webSearchApiKey);
    setWebSearchEnabled(defaultProviderSettings.webSearchEnabled);
    setWebSearchProvider(defaultProviderSettings.webSearchProvider);
    resetWebSearchValidation();
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
          <strong>{'注意：模型和搜索 API Key 都将以明文保存在 localStorage。'}</strong>
          <p>{'仅在个人可信设备上使用。联网校验和实际搜索都由当前浏览器直接请求供应商。'}</p>
        </div>

        <div class={styles['settings-fields']}>
          <section class={styles['settings-group']}>
            <div class={styles['group-heading']}>
              <strong>{'模型服务'}</strong>
              <span>{'配置 OpenAI 兼容的模型接口。'}</span>
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

          <section class={styles['settings-group']}>
            <div class={styles['group-heading']}>
              <strong>{'联网搜索'}</strong>
              <span>{'开启后，Agent 可以调用 web_search 查询最新信息。'}</span>
            </div>

            <label class={styles['toggle-setting']}>
              <span class={styles['toggle-copy']}>
                <strong>{'启用联网搜索'}</strong>
                <small>{'仅在开启时向 Agent 注册联网搜索工具。'}</small>
              </span>
              <span class={styles['toggle-control']}>
                <input
                  checked={webSearchEnabled()}
                  onChange={(event) => handleWebSearchEnabledChange(event.currentTarget.checked)}
                  type='checkbox'
                />
                <span class={styles['toggle-track']} aria-hidden='true'>
                  <span class={styles['toggle-thumb']} />
                </span>
              </span>
            </label>

            <Show when={webSearchEnabled()}>
              <label class={styles['field']}>
                <span class={styles['field-label']}>{'搜索供应商'}</span>
                <select
                  class={styles['select']}
                  name='web-search-provider'
                  onChange={(event) => handleWebSearchProviderChange(event.currentTarget.value)}
                  value={webSearchProvider()}
                >
                  <For each={webSearchProviderOptions}>
                    {(option) => <option value={option.value}>{option.label}</option>}
                  </For>
                </select>
                <Show when={selectedWebSearchProvider()}>
                  {(provider) => (
                    <a class={styles['provider-link']} href={provider().websiteUrl} rel='noreferrer' target='_blank'>
                      {`前往 ${provider().label} 官网获取 API Key ↗`}
                    </a>
                  )}
                </Show>
              </label>

              <ControlledInput
                autocomplete='off'
                label='搜索 API Key'
                name='web-search-api-key'
                onValueChange={handleWebSearchApiKeyChange}
                placeholder='输入所选搜索供应商的 API Key'
                type='password'
                value={webSearchApiKey()}
              />

              <div class={styles['validation-row']}>
                <button
                  class={styles['secondary-button']}
                  disabled={validationStatus() === 'validating'}
                  onClick={() => void handleWebSearchValidation()}
                  type='button'
                >
                  {validationStatus() === 'validating' ? '正在校验…' : '校验联网搜索'}
                </button>
                <Show when={validationMessage()}>
                  <p
                    class={
                      validationStatus() === 'success' ? styles['validation-success'] : styles['validation-message']
                    }
                    aria-live='polite'
                  >
                    {validationMessage()}
                  </p>
                </Show>
              </div>
            </Show>
          </section>

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
