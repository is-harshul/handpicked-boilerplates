import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React, { useEffect, useState } from 'react';

/**
 * Single shared client for the whole app.
 *
 * Why retry: false on both queries and mutations:
 * - Retries belong at the HTTP layer (e.g. ky's `retry` option), not the
 *   query layer. The HTTP client knows the response (status, Retry-After)
 *   and is scoped to one request.
 * - react-query's retry sits above your queryFn. If the queryFn chains
 *   multiple promises (auth → user → profile) and one fails, react-query
 *   retries the whole chain — re-running the parts that already succeeded.
 *   That's wasteful and sometimes wrong (idempotency).
 * Keep retry where the request lives. Disable it here.
 *
 * Why refetchOnReconnect / refetchOnWindowFocus = false:
 * - Sane defaults for transactional / form-heavy apps where a mid-form
 *   refetch can wipe local state. Turn ON for dashboards / read-heavy
 *   surfaces, on a per-query basis.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Lazy-load production devtools so they aren't in the main bundle.
 * Toggle at runtime: `window.toggleDevtools()` from the console.
 * Useful for debugging staging/prod issues without a redeploy.
 */
const ReactQueryDevToolsProduction = React.lazy(() =>
  import('@tanstack/react-query-devtools/production').then((d) => ({
    default: d.ReactQueryDevtools,
  })),
);

declare global {
  interface Window {
    toggleDevtools?: () => void;
  }
}

type Props = { children: React.ReactNode };

export default function QueryProvider({ children }: Props) {
  const [showDevtools, setShowDevtools] = useState(false);

  useEffect(() => {
    window.toggleDevtools = () => setShowDevtools((v) => !v);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Dev devtools always visible in dev builds; bundlers tree-shake. */}
      {process.env.NODE_ENV !== 'production' && <ReactQueryDevtools />}
      {/* Prod devtools are gated behind toggle to keep bundle slim. */}
      {showDevtools && (
        <React.Suspense fallback={null}>
          <ReactQueryDevToolsProduction />
        </React.Suspense>
      )}
    </QueryClientProvider>
  );
}

export { queryClient };
