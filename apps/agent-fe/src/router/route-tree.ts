import AppLayout from '@/components/app-layout/index.jsx';
import AboutPage from '@/pages/about-page/index.jsx';
import AgentPage from '@/pages/agent-page/index.jsx';
import HomePage from '@/pages/home-page/index.jsx';
import ModelSettingsPage from '@/pages/model-settings-page/index.jsx';
import SettingsPage from '@/pages/settings-page/index.jsx';
import WebSearchSettingsPage from '@/pages/web-search-settings-page/index.jsx';
import { createRootRoute, createRoute, redirect } from '@tanstack/react-router';

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

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  beforeLoad: () => {
    return redirect({ to: '/settings/model' });
  }
});

const modelSettingsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'model',
  component: ModelSettingsPage
});

const webSearchSettingsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'web-search',
  component: WebSearchSettingsPage
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage
});

export const routeTree = rootRoute.addChildren([
  homeRoute,
  agentRoute,
  settingsRoute.addChildren([settingsIndexRoute, modelSettingsRoute, webSearchSettingsRoute]),
  aboutRoute
]);
