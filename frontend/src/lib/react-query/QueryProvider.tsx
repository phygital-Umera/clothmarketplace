import {ReactNode, useState} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

export const QueryProvider = ({children}: {children: ReactNode}) => {
  // Created once; a new client on every render would drop the cache
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {retry: 1, refetchOnWindowFocus: false, staleTime: 30_000},
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

export default QueryProvider;
