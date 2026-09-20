import ControlledInput from '@/components/controlled-input/index.jsx';
import FormSubmitButton from '@/components/form-submit-button/index.jsx';
import TokenStreamingSetting from '@/components/token-streaming-setting/index.jsx';
import { readFormString } from '@/utils/form-data.js';
import { createObservabilityTraceId, recordObservabilityEvent } from '@/utils/observability-log.js';
import {
  clearProviderSettings,
  defaultProviderSettings,
  modelSettingsSchema,
  providerSettingsCollection,
  saveProviderSettings
} from '@/utils/provider-settings.js';
import { useLiveQuery } from '@tanstack/react-db';
import { useActionState, useState } from 'react';
import styles from '../settings-page/index.module.css';

type ModelSettingsActionState = {
  error: string;
  saved: boolean;
};

const initialModelSettingsActionState: ModelSettingsActionState = {
  error: '',
  saved: false
};

const ModelSettingsPage = () => {
  const settingsQuery = useLiveQuery((query) => query.from({ settings: providerSettingsCollection }));
  const savedSettings = settingsQuery.data[0];
  const [draftApiKey, setDraftApiKey] = useState<string>();
  const [draftBaseUrl, setDraftBaseUrl] = useState<string>();
  const [draftModel, setDraftModel] = useState<string>();
  const [draftStreamingEnabled, setDraftStreamingEnabled] = useState<boolean>();
  const apiKey = draftApiKey ?? savedSettings?.apiKey ?? defaultProviderSettings.apiKey;
  const baseUrl = draftBaseUrl ?? savedSettings?.baseUrl ?? defaultProviderSettings.baseUrl;
  const model = draftModel ?? savedSettings?.model ?? defaultProviderSettings.model;
  const streamingEnabled =
    draftStreamingEnabled ?? savedSettings?.streamingEnabled ?? defaultProviderSettings.streamingEnabled;

  const [actionState, submitSettings] = useActionState(
    (_previous: ModelSettingsActionState, formData: FormData): ModelSettingsActionState => {
      if (readFormString(formData, 'intent', 'save') === 'clear') {
        clearProviderSettings();
        setDraftApiKey(undefined);
        setDraftBaseUrl(undefined);
        setDraftModel(undefined);
        setDraftStreamingEnabled(undefined);
        recordObservabilityEvent({
          event: 'settings.cleared',
          scope: 'settings',
          traceId: createObservabilityTraceId('settings')
        });
        return initialModelSettingsActionState;
      }

      const result = modelSettingsSchema.safeParse({
        apiKey: readFormString(formData, 'api-key'),
        baseUrl: readFormString(formData, 'base-url'),
        model: readFormString(formData, 'model'),
        streamingEnabled: formData.get('streaming-enabled') === 'on'
      });

      if (!result.success) {
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
        return {
          error: result.error.issues[0]?.message ?? '配置无效。',
          saved: false
        };
      }

      const currentSettings = settingsQuery.data[0] ?? defaultProviderSettings;

      saveProviderSettings({ ...currentSettings, ...result.data });
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
      return {
        error: '',
        saved: true
      };
    },
    initialModelSettingsActionState
  );

  return (
    <form action={submitSettings} className={styles['settings-fields']}>
      <title>{'模型设置 · Liry Agent'}</title>
      <section className={styles['settings-group']}>
        <div className={styles['group-heading']}>
          <strong>{'模型服务'}</strong>
          <span>{'配置 OpenAI 兼容的模型接口与输出方式。'}</span>
        </div>

        <ControlledInput
          autoComplete='off'
          label='API Key'
          name='api-key'
          onValueChange={setDraftApiKey}
          placeholder='sk-...'
          type='password'
          value={apiKey}
        />

        <ControlledInput
          autoComplete='url'
          inputMode='url'
          label='Base URL'
          name='base-url'
          onValueChange={setDraftBaseUrl}
          placeholder='https://api.openai.com/v1'
          type='url'
          value={baseUrl}
        />

        <ControlledInput
          autoComplete='off'
          label='模型名'
          name='model'
          onValueChange={setDraftModel}
          placeholder='gpt-4o-mini'
          type='text'
          value={model}
        />

        <TokenStreamingSetting
          checked={streamingEnabled}
          name='streaming-enabled'
          onChange={setDraftStreamingEnabled}
        />
      </section>

      {actionState.error ? <p className={styles['error']}>{actionState.error}</p> : null}
      {actionState.saved ? <p className={styles['success']}>{'模型设置已保存。'}</p> : null}

      <div className={styles['actions']}>
        <FormSubmitButton className={styles['primary-button'] ?? ''} name='intent' value='save'>
          {'保存模型设置'}
        </FormSubmitButton>
        <FormSubmitButton className={styles['danger-button'] ?? ''} name='intent' value='clear'>
          {'删除全部本地设置'}
        </FormSubmitButton>
      </div>
    </form>
  );
};

export default ModelSettingsPage;
