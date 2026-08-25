import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Navigate,
} from '@tanstack/react-router';
import { App } from '@/App';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { MainLayout } from '@/components/layout/MainLayout';
import { NotFoundPage } from '@/pages/NotFoundPage';

const rootRoute = createRootRoute({ component: App, notFoundComponent: NotFoundPage });
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to="/dashboard" replace />,
});
const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_auth',
  component: AuthLayout,
});
const loginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/login',
  component: lazyRouteComponent(() => import('@/pages/LoginPage'), 'LoginPage'),
});
const registerRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/register',
  component: lazyRouteComponent(() => import('@/pages/RegisterPage'), 'RegisterPage'),
});
const mainLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_app',
  component: MainLayout,
});
const dashboardRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/dashboard',
  component: lazyRouteComponent(() => import('@/pages/DashboardPage'), 'DashboardPage'),
});
const profileRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/profile',
  component: lazyRouteComponent(() => import('@/pages/ProfilePage'), 'ProfilePage'),
});
const usersRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: '/users',
  component: lazyRouteComponent(() => import('@/pages/UsersManagementPage'), 'UsersManagementPage'),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  authLayoutRoute.addChildren([loginRoute, registerRoute]),
  mainLayoutRoute.addChildren([dashboardRoute, profileRoute, usersRoute]),
]);
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
