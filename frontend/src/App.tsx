import {RouterProvider, createRouter} from '@tanstack/react-router';

// Import the generated route tree
import {Toaster} from 'react-hot-toast';
import AuthContextProvider from './context/AuthContextProvider';
import NotFound404 from './layouts/NotFound404';
import QueryProvider from './lib/react-query/QueryProvider';
import {routeTree} from './routeTree.gen';

// Create a new router instance
const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFound404,
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const App = () => {
  return (
    <AuthContextProvider>
      <div>
        <Toaster />
      </div>

      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </AuthContextProvider>
  );
};

export default App;
