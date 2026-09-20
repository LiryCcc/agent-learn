import { router } from '@/router/index.js';
import { RouterProvider } from '@tanstack/react-router';
import styles from './index.module.css';

const AppRoot = () => {
  return (
    <div className={styles['root']}>
      <RouterProvider router={router} />
    </div>
  );
};

export default AppRoot;
