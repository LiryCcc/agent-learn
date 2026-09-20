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
import { useLiveQuery } from '@tanstack/react-db';
import { useEffect, useRef, useState } from 'react';
import styles from '../settings-page/index.module.css';

const ModelSettingsPage = () => {
  const settingsQuery = useLiveQuery((query) => query.from({ settings: providerSettingsCollection }));
  const [apiKey, setApiKey] = useState(defaultProviderSettings.apiKey);
  const [baseUrl, setBaseUrl] = useState(defaultProviderSettings.baseUrl);
  const [model, setModel] = useState(defaultProviderSettings.model);
  const [streamingEnabled, setStreamingEnabled] = useState(defaultProviderSettings.streamingEnabled);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const loadedSavedSettings = useRef(false);

  useEffect(() => {
    const currentSettings = settingsQuery.data[0];

    if (!currentSettings || loadedSavedSettings.current) {
      return;
    }

    setApiKey(currentSettings.apiKey);
    setBaseUrl(currentSettings.baseUrl);
    setModel(currentSettings.model);
    setStreamingEnabled(currentSettings.streamingEnabled);
    loadedSavedSettings.current = true;
  }, [settingsQuery.data]);

  const handleSave = () => {
    setError('');
    setSaved(false);

    const result = modelSettingsSchema.safeParse({
      apiKey,
      baseUrl,
      model,
      streamingEnabled
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

    const currentSettings = settingsQuery.data[0] ?? defaultProviderSettings;

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
    loadedSavedSettings.current = false;
    recordObservabilityEvent({
      event: 'settings.cleared',
      scope: 'settings',
      traceId: createObservabilityTraceId('settings')
    });
  };

  return (
    <div className={styles['settings-fields']}>
      <section className={styles['settings-group']}>
        <div className={styles['group-heading']}>
          <strong>{'模型服务'}</strong>
          <span>{'配置 OpenAI 兼容的模型接口与输出方式。'}</span>
        </div>

        <ControlledInput
          autoComplete='off'
          label='API Key'
          name='api-key'
          onValueChange={setApiKey}
          placeholder='sk-...'
          type='password'
          value={apiKey}
        />

        <ControlledInput
          autoComplete='url'
          inputMode='url'
          label='Base URL'
          name='base-url'
          onValueChange={setBaseUrl}
          placeholder='https://api.openai.com/v1'
          type='url'
          value={baseUrl}
        />

        <ControlledInput
          autoComplete='off'
          label='模型名'
          name='model'
          onValueChange={setModel}
          placeholder='gpt-4o-mini'
          type='text'
          value={model}
        />

        <TokenStreamingSetting checked={streamingEnabled} onChange={setStreamingEnabled} />
      </section>

      {error ? <p className={styles['error']}>{error}</p> : null}
      {saved ? <p className={styles['success']}>{'模型设置已保存。'}</p> : null}

      <div className={styles['actions']}>
        <button className={styles['primary-button']} type='button' onClick={handleSave}>
          {'保存模型设置'}
        </button>
        <button className={styles['danger-button']} type='button' onClick={handleClear}>
          {'删除全部本地设置'}
        </button>
      </div>
    </div>
  );
};

export default ModelSettingsPage;
