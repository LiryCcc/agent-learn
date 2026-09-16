import AppRoot from '@/app/app-root/index.jsx';
import { buildInfo } from '@/utils/build-info.js';
import { createObservabilityTraceId, recordObservabilityEvent } from '@/utils/observability-log.js';
import { queryClient } from '@/utils/query-client.js';
import { QueryClientProvider } from '@tanstack/solid-query';
import { SolidQueryDevtools } from '@tanstack/solid-query-devtools';
import { onMount } from 'solid-js';
import styles from './index.module.css';

const AppProviders = () => {
  onMount(() => {
    recordObservabilityEvent({
      details: {
        branch: buildInfo.branch,
        buildMode: buildInfo.mode,
        commit: buildInfo.commit
      },
      event: 'application.started',
      scope: 'application',
      traceId: createObservabilityTraceId('application')
    });
  });

  return (
    <QueryClientProvider client={queryClient}>
      <div class={styles['root']}>
        <AppRoot />
      </div>
      <SolidQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default AppProviders;
