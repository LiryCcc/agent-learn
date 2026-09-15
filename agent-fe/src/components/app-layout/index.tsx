import { Link, Outlet } from '@tanstack/solid-router';
import { TanStackRouterDevtools } from '@tanstack/solid-router-devtools';
import styles from './index.module.css';

const AppLayout = () => {
  return (
    <div class={styles['layout']}>
      <header class={styles['header']}>
        <Link class={styles['brand']} to='/'>
          <span class={styles['brand-mark']}>{'L'}</span>
          <span>
            {'Liry Agent'}
            <small>{'Browser workspace'}</small>
          </span>
        </Link>
        <nav aria-label='主导航' class={styles['navigation']}>
          <Link
            activeOptions={{ exact: true }}
            activeProps={{ 'aria-current': 'page' }}
            class={styles['nav-link']}
            to='/'
          >
            {'首页'}
          </Link>
          <Link activeProps={{ 'aria-current': 'page' }} class={styles['nav-link']} to='/agent'>
            {'Agent'}
          </Link>
          <Link activeProps={{ 'aria-current': 'page' }} class={styles['nav-link']} to='/settings'>
            {'设置'}
          </Link>
          <Link activeProps={{ 'aria-current': 'page' }} class={styles['nav-link']} to='/about'>
            {'关于'}
          </Link>
        </nav>
      </header>
      <Outlet />
      <TanStackRouterDevtools position='bottom-right' />
    </div>
  );
};

export default AppLayout;
