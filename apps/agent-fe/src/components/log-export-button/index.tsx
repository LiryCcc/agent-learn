import { exportObservabilityLogs, type ObservabilityExportFormat } from '@/utils/observability-log.js';
import { createSignal } from 'solid-js';
import styles from './index.module.css';

const LogExportButton = () => {
  const [lastExport, setLastExport] = createSignal<{
    count: number;
    format: ObservabilityExportFormat;
  }>();

  const handleExport = (format: ObservabilityExportFormat) => {
    const result = exportObservabilityLogs(format);

    setLastExport({
      count: result.entryCount,
      format: result.format
    });
  };
  const exportDescription = () => {
    const result = lastExport();

    if (result === undefined) {
      return '导出本地日志与构建信息，可选 JSONL 或文本。';
    }

    const formatLabel = result.format === 'jsonl' ? 'JSONL' : '文本';

    return `已导出 ${String(result.count)} 条日志（${formatLabel}）。`;
  };

  return (
    <div class={styles['export-control']}>
      <div class={styles['export-copy']}>
        <strong>{'可观测性日志'}</strong>
        <span>{exportDescription()}</span>
      </div>
      <div class={styles['export-actions']}>
        <button
          onClick={() => {
            handleExport('jsonl');
          }}
          type='button'
        >
          {'导出 JSONL'}
        </button>
        <button
          onClick={() => {
            handleExport('text');
          }}
          type='button'
        >
          {'导出文本'}
        </button>
      </div>
    </div>
  );
};

export default LogExportButton;
