import { getWebSearchValidationErrorMessage, validateWebSearchConnection } from '@/api/web-search.js';
import ControlledInput from '@/components/controlled-input/index.jsx';
import FormSubmitButton from '@/components/form-submit-button/index.jsx';
import { readFormString } from '@/utils/form-data.js';
import { createObservabilityTraceId, recordObservabilityEvent } from '@/utils/observability-log.js';
import {
  clearProviderSettings,
  defaultProviderSettings,
  providerSettingsCollection,
  saveProviderSettings,
  webSearchProviderOptions,
  webSearchSettingsSchema
} from '@/utils/provider-settings.js';
import { useLiveQuery } from '@tanstack/react-db';
import { useActionState, useState, useTransition } from 'react';
import styles from '../settings-page/index.module.css';

type ValidationStatus = 'error' | 'idle' | 'success';

type WebSearchActionState = {
  error: string;
  saved: boolean;
};

const initialWebSearchActionState: WebSearchActionState = {
  error: '',
  saved: false
};

const WebSearchSettingsPage = () => {
  const settingsQuery = useLiveQuery((query) => query.from({ settings: providerSettingsCollection }));
  const savedSettings = settingsQuery.data[0];
  const [draftWebSearchApiKey, setDraftWebSearchApiKey] = useState<string>();
  const [draftWebSearchEnabled, setDraftWebSearchEnabled] = useState<boolean>();
  const [draftWebSearchProvider, setDraftWebSearchProvider] = useState<
    typeof defaultProviderSettings.webSearchProvider | undefined
  >();
  const [validationMessage, setValidationMessage] = useState('');
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [isValidating, startValidation] = useTransition();
  const webSearchApiKey =
    draftWebSearchApiKey ?? savedSettings?.webSearchApiKey ?? defaultProviderSettings.webSearchApiKey;
  const webSearchEnabled =
    draftWebSearchEnabled ?? savedSettings?.webSearchEnabled ?? defaultProviderSettings.webSearchEnabled;
  const webSearchProvider =
    draftWebSearchProvider ?? savedSettings?.webSearchProvider ?? defaultProviderSettings.webSearchProvider;

  const selectedWebSearchProvider = webSearchProviderOptions.find((option) => option.value === webSearchProvider);

  const resetWebSearchValidation = () => {
    setValidationMessage('');
    setValidationStatus('idle');
  };

  const handleWebSearchApiKeyChange = (value: string) => {
    setDraftWebSearchApiKey(value);
    resetWebSearchValidation();
  };

  const handleWebSearchEnabledChange = (enabled: boolean) => {
    setDraftWebSearchEnabled(enabled);
    resetWebSearchValidation();
  };

  const handleWebSearchProviderChange = (value: string) => {
    const option = webSearchProviderOptions.find((candidate) => candidate.value === value);

    if (option) {
      setDraftWebSearchProvider(option.value);
      resetWebSearchValidation();
    }
  };

  const [actionState, submitSettings] = useActionState(
    (_previous: WebSearchActionState, formData: FormData): WebSearchActionState => {
      if (readFormString(formData, 'intent', 'save') === 'clear') {
        clearProviderSettings();
        setDraftWebSearchApiKey(undefined);
        setDraftWebSearchEnabled(undefined);
        setDraftWebSearchProvider(undefined);
        resetWebSearchValidation();
        recordObservabilityEvent({
          event: 'settings.cleared',
          scope: 'settings',
          traceId: createObservabilityTraceId('settings')
        });
        return initialWebSearchActionState;
      }

      const result = webSearchSettingsSchema.safeParse({
        webSearchApiKey: readFormString(formData, 'web-search-api-key'),
        webSearchEnabled: formData.get('web-search-enabled') === 'on',
        webSearchProvider: readFormString(formData, 'web-search-provider', defaultProviderSettings.webSearchProvider)
      });

      if (!result.success) {
        recordObservabilityEvent({
          details: {
            issueCount: result.error.issues.length,
            issues: result.error.issues.map((issue) => ({ code: issue.code, path: issue.path }))
          },
          event: 'settings.web-search.validation.failed',
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
          hasWebSearchApiKey: result.data.webSearchApiKey.length > 0,
          webSearchEnabled: result.data.webSearchEnabled,
          webSearchProvider: result.data.webSearchProvider
        },
        event: 'settings.web-search.saved',
        scope: 'settings',
        traceId: createObservabilityTraceId('settings')
      });
      return {
        error: '',
        saved: true
      };
    },
    initialWebSearchActionState
  );

  const handleWebSearchValidationClick = () => {
    const apiKeyValue = webSearchApiKey.trim();
    const providerValue = webSearchProvider;
    const traceId = createObservabilityTraceId('settings');

    if (!apiKeyValue) {
      setValidationStatus('error');
      setValidationMessage('请先输入搜索供应商 API Key。');
      return;
    }

    startValidation(async () => {
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
        setValidationMessage(`校验成功，搜索服务返回 ${String(result.resultCount)} 条结果。`);
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
    });
  };

  return (
    <form action={submitSettings} className={styles['settings-fields']}>
      <title>{'联网搜索设置 · Liry Agent'}</title>
      <section className={styles['settings-group']}>
        <div className={styles['group-heading']}>
          <strong>{'联网搜索'}</strong>
          <span>{'开启后，Agent 可以调用 web_search 查询最新信息。'}</span>
        </div>

        <label className={styles['toggle-setting']}>
          <span className={styles['toggle-copy']}>
            <strong>{'启用联网搜索'}</strong>
            <small>{'仅在开启时向 Agent 注册联网搜索工具。'}</small>
          </span>
          <span className={styles['toggle-control']}>
            <input
              checked={webSearchEnabled}
              name='web-search-enabled'
              onChange={(event) => {
                handleWebSearchEnabledChange(event.currentTarget.checked);
              }}
              type='checkbox'
            />
            <span className={styles['toggle-track']} aria-hidden='true'>
              <span className={styles['toggle-thumb']} />
            </span>
          </span>
        </label>

        {webSearchEnabled ? (
          <>
            <label className={styles['field']}>
              <span className={styles['field-label']}>{'搜索供应商'}</span>
              <select
                className={styles['select']}
                name='web-search-provider'
                onChange={(event) => {
                  handleWebSearchProviderChange(event.currentTarget.value);
                }}
                value={webSearchProvider}
              >
                {webSearchProviderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {selectedWebSearchProvider ? (
                <a
                  className={styles['provider-link']}
                  href={selectedWebSearchProvider.websiteUrl}
                  rel='noreferrer'
                  target='_blank'
                >
                  {`前往 ${selectedWebSearchProvider.label} 官网获取 API Key ↗`}
                </a>
              ) : null}
            </label>

            <ControlledInput
              autoComplete='off'
              label='搜索 API Key'
              name='web-search-api-key'
              onValueChange={handleWebSearchApiKeyChange}
              placeholder='输入所选搜索供应商的 API Key'
              type='password'
              value={webSearchApiKey}
            />

            <div className={styles['validation-row']}>
              <button
                className={styles['secondary-button']}
                disabled={isValidating}
                onClick={handleWebSearchValidationClick}
                type='button'
              >
                {isValidating ? '正在校验…' : '校验联网搜索'}
              </button>
              {isValidating || validationMessage ? (
                <p
                  className={
                    !isValidating && validationStatus === 'success'
                      ? styles['validation-success']
                      : styles['validation-message']
                  }
                  aria-live='polite'
                >
                  {isValidating ? '正在向搜索供应商发送校验请求…' : validationMessage}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <input name='web-search-api-key' type='hidden' value={webSearchApiKey} />
            <input name='web-search-provider' type='hidden' value={webSearchProvider} />
          </>
        )}
      </section>

      {actionState.error ? <p className={styles['error']}>{actionState.error}</p> : null}
      {actionState.saved ? <p className={styles['success']}>{'联网搜索设置已保存。'}</p> : null}

      <div className={styles['actions']}>
        <FormSubmitButton className={styles['primary-button'] ?? ''} name='intent' value='save'>
          {'保存联网搜索设置'}
        </FormSubmitButton>
        <FormSubmitButton className={styles['danger-button'] ?? ''} name='intent' value='clear'>
          {'删除全部本地设置'}
        </FormSubmitButton>
      </div>
    </form>
  );
};

export default WebSearchSettingsPage;
