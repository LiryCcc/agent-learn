import { createHashHistory, createRouter } from '@tanstack/react-router';
import { routeTree } from './route-tree.js';

const useHashRouting = import.meta.env['VITE_USE_HASH_ROUTING'] === 'true';

export const router = createRouter({
  routeTree,
  ...(useHashRouting ? { history: createHashHistory() } : {}),
  defaultPreload: 'intent'
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
