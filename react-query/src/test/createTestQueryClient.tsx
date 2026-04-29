import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Test-only QueryClient. Critical settings:
 * - retry: false → tests fail fast instead of waiting for retry attempts
 * - gcTime: Infinity → cache survives across renders within one test
 * - logger silenced via no-op in v5 (use the QueryCache onError if needed)
 *
 * Always create a NEW client per test. Sharing one across tests leaks
 * state and produces order-dependent flakes.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

/**
 * Wrapper for `@testing-library/react` renderHook / render:
 *
 *   const wrapper = createWrapper();
 *   const { result } = renderHook(() => useUser('1'), { wrapper });
 */
export function createWrapper() {
  const client = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
