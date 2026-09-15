import { createRootRoute, createRoute } from '@tanstack/solid-router';
import AppLayout from '@/components/app-layout/index.jsx';
import AboutPage from '@/pages/about-page/index.jsx';
import AgentPage from '@/pages/agent-page/index.jsx';
import HomePage from '@/pages/home-page/index.jsx';
import SettingsPage from '@/pages/settings-page/index.jsx';

const rootRoute = createRootRoute({ component: AppLayout });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage
});

const agentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agent',
  component: AgentPage
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage
});

export const routeTree = rootRoute.addChildren([homeRoute, agentRoute, settingsRoute, aboutRoute]);
