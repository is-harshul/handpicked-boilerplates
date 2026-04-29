/**
 * Centralized query keys.
 *
 * Why: every cache invalidation, prefetch, and optimistic update needs to
 * reference the *exact* same key shape. Hardcoded array literals
 * (`['user', id]`) drift over time — a typo or reordered arg silently
 * breaks invalidation. Co-locating keys here makes them one source of
 * truth and cheap to refactor.
 *
 * Pattern: each entity gets a factory object whose methods return tuples.
 * Use `as const` so TS preserves literal types.
 *
 *   queryKeys.user.detail(id)        // ['user', 'detail', id]
 *   queryKeys.user.all               // ['user']  — invalidate all user queries
 *   queryKeys.orders.list(filters)   // ['orders', 'list', { status, page }]
 */
export const queryKeys = {
  user: {
    all: ['user'] as const,
    detail: (id: string) => ['user', 'detail', id] as const,
    profile: (id: string) => ['user', 'profile', id] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (filters: { status?: string; page?: number }) =>
      ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  journey: {
    all: ['journey'] as const,
    current: () => ['journey', 'current'] as const,
    featureFlags: () => ['journey', 'featureFlags'] as const,
  },
} as const;
