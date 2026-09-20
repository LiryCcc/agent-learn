import AppRoot from '@/app/app-root/index.jsx';
import { buildInfo } from '@/utils/build-info.js';
import { initializeColorTheme } from '@/utils/color-theme.js';
import { createObservabilityTraceId, recordObservabilityEvent } from '@/utils/observability-log.js';
import { queryClient } from '@/utils/query-client.js';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect } from 'react';
import styles from './index.module.css';

initializeColorTheme();

const AppProviders = () => {
  useEffect(() => {
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
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className={styles['root']}>
        <AppRoot />
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default AppProviders;
