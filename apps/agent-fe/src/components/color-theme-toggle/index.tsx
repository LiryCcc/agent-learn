import { colorTheme, toggleColorTheme } from '@/utils/color-theme.js';
import { createObservabilityTraceId, recordObservabilityEvent } from '@/utils/observability-log.js';
import styles from './index.module.css';

const ColorThemeToggle = () => {
  const handleToggle = () => {
    const theme = toggleColorTheme();

    recordObservabilityEvent({
      details: { theme },
      event: 'color-theme.changed',
      scope: 'application',
      traceId: createObservabilityTraceId('color-theme')
    });
  };

  return (
    <button
      aria-label={colorTheme() === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
      class={styles['toggle-button']}
      onClick={handleToggle}
      title={colorTheme() === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
      type='button'
    >
      <span aria-hidden='true' class={styles['icon']}>
        {colorTheme() === 'dark' ? '☀' : '☾'}
      </span>
      <span class={styles['label']}>{colorTheme() === 'dark' ? '浅色' : '深色'}</span>
    </button>
  );
};

export default ColorThemeToggle;
