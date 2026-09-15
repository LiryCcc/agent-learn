import { createRouter } from '@tanstack/solid-router';
import { routeTree } from './route-tree.js';

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent'
});

declare module '@tanstack/solid-router' {
  interface Register {
    router: typeof router;
  }
}
