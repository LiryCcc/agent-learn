import { createSignal } from 'solid-js';
import { exportObservabilityLogs } from '@/utils/observability-log.js';
import styles from './index.module.css';

const LogExportButton = () => {
  const [lastExportCount, setLastExportCount] = createSignal<number>();

  const handleExport = () => {
    const result = exportObservabilityLogs();

    setLastExportCount(result.entryCount);
  };

  return (
    <div class={styles['export-control']}>
      <div>
        <strong>{'可观测性日志'}</strong>
        <span>
          {lastExportCount() === undefined ? '导出本地日志与构建信息。' : `已导出 ${lastExportCount()} 条日志。`}
        </span>
      </div>
      <button onClick={handleExport} type='button'>
        {'一键导出 JSON'}
      </button>
    </div>
  );
};

export default LogExportButton;
