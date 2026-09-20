import ColorThemeToggle from '@/components/color-theme-toggle/index.jsx';
import { Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import styles from './index.module.css';

const AppLayout = () => {
  return (
    <div className={styles['layout']}>
      <header className={styles['header']}>
        <Link className={styles['brand']} to='/'>
          <span className={styles['brand-mark']}>{'L'}</span>
          <span>
            {'Liry Agent'}
            <small>{'Browser workspace'}</small>
          </span>
        </Link>
        <div className={styles['header-actions']}>
          <nav aria-label='主导航' className={styles['navigation']}>
            <Link
              activeOptions={{ exact: true }}
              activeProps={{ 'aria-current': 'page' }}
              className={styles['nav-link']}
              to='/'
            >
              {'首页'}
            </Link>
            <Link activeProps={{ 'aria-current': 'page' }} className={styles['nav-link']} to='/agent'>
              {'Agent'}
            </Link>
            <Link activeProps={{ 'aria-current': 'page' }} className={styles['nav-link']} to='/settings'>
              {'设置'}
            </Link>
            <Link activeProps={{ 'aria-current': 'page' }} className={styles['nav-link']} to='/about'>
              {'关于'}
            </Link>
          </nav>
          <ColorThemeToggle />
        </div>
      </header>
      <Outlet />
      <TanStackRouterDevtools position='bottom-right' />
    </div>
  );
};

export default AppLayout;
