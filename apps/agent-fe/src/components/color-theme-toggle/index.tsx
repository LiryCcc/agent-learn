import { colorThemeStore, toggleColorTheme } from '@/utils/color-theme.js';
import { createObservabilityTraceId, recordObservabilityEvent } from '@/utils/observability-log.js';
import { useSelector } from '@tanstack/react-store';
import styles from './index.module.css';

const ColorThemeToggle = () => {
  const theme = useSelector(colorThemeStore);

  const handleToggle = () => {
    const nextTheme = toggleColorTheme();

    recordObservabilityEvent({
      details: { theme: nextTheme },
      event: 'color-theme.changed',
      scope: 'application',
      traceId: createObservabilityTraceId('color-theme')
    });
  };

  return (
    <button
      aria-label={theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
      className={styles['toggle-button']}
      onClick={handleToggle}
      title={theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
      type='button'
    >
      <span aria-hidden='true' className={styles['icon']}>
        {theme === 'dark' ? '☀' : '☾'}
      </span>
      <span className={styles['label']}>{theme === 'dark' ? '浅色' : '深色'}</span>
    </button>
  );
};

export default ColorThemeToggle;
