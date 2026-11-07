import {createRootRoute, Link, Outlet, ScrollRestoration} from '@tanstack/react-router';
import Layout from '@/components/Layout';
import {btn, Empty} from '@/components/ui';

export const Route = createRootRoute({
  component: () => (
    <Layout>
      <ScrollRestoration />
      <Outlet />
    </Layout>
  ),
  notFoundComponent: () => (
    <Empty
      title="Page not found"
      text="This page doesn't exist or has moved."
      action={
        <Link to="/" className={btn.primary}>
          Go to the store
        </Link>
      }
    />
  ),
});
