import { exportObservabilityLogs } from '@/utils/observability-log.js';
import { createSignal } from 'solid-js';
import styles from './index.module.css';

const LogExportButton = () => {
  const [lastExportCount, setLastExportCount] = createSignal<number>();

  const handleExport = () => {
    const result = exportObservabilityLogs();

    setLastExportCount(result.entryCount);
  };
  const exportDescription = () => {
    const exportCount = lastExportCount();

    return exportCount === undefined ? '导出本地日志与构建信息。' : `已导出 ${String(exportCount)} 条日志。`;
  };

  return (
    <div class={styles['export-control']}>
      <div>
        <strong>{'可观测性日志'}</strong>
        <span>{exportDescription()}</span>
      </div>
      <button onClick={handleExport} type='button'>
        {'一键导出 JSON'}
      </button>
    </div>
  );
};

export default LogExportButton;
