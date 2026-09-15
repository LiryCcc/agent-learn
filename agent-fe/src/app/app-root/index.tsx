import { RouterProvider } from '@tanstack/solid-router';
import { router } from '@/router/index.js';
import styles from './index.module.css';

const AppRoot = () => {
  return (
    <div class={styles['root']}>
      <RouterProvider router={router} />
    </div>
  );
};

export default AppRoot;
