import { Link, Outlet } from '@tanstack/react-router';
import styles from './index.module.css';

const SettingsPage = () => {
  return (
    <main className={styles['page']}>
      <section className={styles['hero']}>
        <p className={styles['eyebrow']}>{'TANSTACK DB · LOCAL STORAGE'}</p>
        <h1>{'设置'}</h1>
        <p>{'分别配置模型服务与 Agent 的扩展能力。'}</p>
      </section>

      <nav aria-label='设置分类' className={styles['tabs']}>
        <Link
          activeOptions={{ exact: true }}
          activeProps={{ 'aria-current': 'page' }}
          className={styles['tab-link']}
          to='/settings/model'
        >
          {'模型服务'}
        </Link>
        <Link
          activeOptions={{ exact: true }}
          activeProps={{ 'aria-current': 'page' }}
          className={styles['tab-link']}
          to='/settings/web-search'
        >
          {'联网搜索'}
        </Link>
      </nav>

      <section className={styles['card']}>
        <div className={styles['security-warning']}>
          <strong>{'注意：模型和搜索 API Key 都将以明文保存在 localStorage。'}</strong>
          <p>{'仅在个人可信设备上使用。模型、联网校验和实际搜索都由当前浏览器直接请求供应商。'}</p>
        </div>
        <Outlet />
      </section>
    </main>
  );
};

export default SettingsPage;
