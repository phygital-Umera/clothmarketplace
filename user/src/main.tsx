import React from 'react';
import ReactDOM from 'react-dom/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {createRouter, RouterProvider} from '@tanstack/react-router';
import {Toaster} from 'react-hot-toast';
import {AuthProvider} from '@/lib/auth';
import {routeTree} from './routeTree.gen';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {queries: {staleTime: 30_000, retry: 1, refetchOnWindowFocus: false}},
});

const router = createRouter({routeTree, defaultPreload: 'intent'});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" toastOptions={{style: {fontSize: 14}}} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
