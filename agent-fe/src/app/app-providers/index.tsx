import { QueryClientProvider } from '@tanstack/solid-query';
import { SolidQueryDevtools } from '@tanstack/solid-query-devtools';
import { queryClient } from '@/utils/query-client.js';
import AppRoot from '@/app/app-root/index.jsx';
import styles from './index.module.css';

const AppProviders = () => {
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
