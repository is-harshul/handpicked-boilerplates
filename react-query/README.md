# react-query (TanStack Query) — patterns & best practices

Plug-and-play TanStack Query setup distilled from a production fintech codebase (mutual-funds platform). Provider, key factory, hook patterns, prefetch utilities, and a test wrapper. Drop the `src/` folder into your project and import what you need.

> Library is now called **TanStack Query** but the package is still `@tanstack/react-query`. This boilerplate targets v5.

---

## Why react-query

You're not building a "data layer" — you're managing **server state**, which has properties client state doesn't:

- It's owned remotely (you can't trust your local copy).
- It's shared between components and tabs.
- It can become stale at any moment.
- The same fetch from two components shouldn't fire twice.

Without a library, every codebase reinvents: cache, deduping, refetch-on-mount, refetch-on-focus, in-flight cancellation, optimistic updates, polling. react-query is ~13kb min+gz and gets all of this right.

---

## File layout

```
react-query/
├── README.md
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                          ← public API
    ├── provider/QueryProvider.tsx        ← QueryClient + devtools
    ├── keys/queryKeys.ts                 ← centralized key factory
    ├── services/userService.ts           ← plain fetch fns (no react-query)
    ├── hooks/
    │   ├── useUser.ts                    ← query, lazy query, mutation, optimistic
    │   ├── useOrders.ts                  ← paginated list with keepPreviousData
    │   └── useJourneyPolling.ts          ← polling that stops on terminal state
    ├── examples/
    │   ├── UserProfilePage.tsx           ← read + write screen
    │   └── prefetch.ts                   ← prefetchQuery + setQueryData
    └── test/createTestQueryClient.tsx    ← per-test client + RTL wrapper
```

---

## Setup (3 steps)

### 1. Install

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

### 2. Wrap your app

```tsx
import QueryProvider from './lib/react-query';

<QueryProvider>
  <App />
</QueryProvider>
```

See [src/provider/QueryProvider.tsx](src/provider/QueryProvider.tsx).

### 3. Build hooks per feature

Don't sprinkle `useQuery` calls across components. Wrap each query/mutation in a custom hook (`useUser`, `useOrders`, …) that owns the queryKey and queryFn. Components stay declarative; refactors stay local.

See [src/hooks/](src/hooks/).

---

## Important points to remember while implementing

These are the ones that actually bite people. Read once before writing your first hook.

### 1. Disable retry; let the HTTP layer handle it

```ts
new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false }}})
```

react-query's retry sits **above** your `queryFn`. If your queryFn chains promises (auth → user → profile) and one fails, react-query retries the **whole chain** — re-running the parts that succeeded. That's wasteful and sometimes wrong (POST idempotency). Retries belong in the HTTP client (e.g. ky's `retry`) which is scoped to a single request.

### 2. One QueryClient per app, never per render

`new QueryClient()` inside a component creates a fresh cache on every render and you lose all the benefits. Define it at module top-level (the provider in this boilerplate does that).

### 3. queryKey IS the cache key — keep it stable and complete

If your query depends on `userId` and `filters`, **both** go in the key:

```ts
queryKey: ['orders', userId, filters]   // ✓
queryKey: ['orders', userId]            // ✗ filters change → stale data
```

Same shape rule applies for invalidation. Centralize keys (see [keys/queryKeys.ts](src/keys/queryKeys.ts)) so a typo or arg-order change can't silently break invalidations elsewhere.

### 4. `staleTime` is the lever 99% of devs miss

Default `staleTime: 0` means every mount triggers a refetch. For data that doesn't change second-by-second (user profile, feature flags, config), set `staleTime` to minutes. You'll cut your API traffic dramatically and remove flicker.

```ts
staleTime: 5 * 60 * 1000   // fresh for 5 min, no refetch on remount
```

`gcTime` (formerly `cacheTime`) is different — it's how long *unused* data sits in memory before GC. Default 5 min is usually fine.

### 5. `enabled: false` for lazy/manual queries

Don't conditionally call hooks (rules of hooks violation). Mount the hook always, gate it with `enabled: false`, then trigger via `refetch()`. Idiomatic for typeahead, on-demand prefill, gated reads.

### 6. Polling: stop on terminal state

```ts
refetchInterval: (q) => q.state.data?.status === 'COMPLETED' ? false : 3000
```

Don't poll forever. Use the function form and return `false` once the server reaches a terminal state. Otherwise an idle tab keeps hammering your API.

For polling that must continue when the tab is unfocused, set `refetchIntervalInBackground: true` (off by default to save battery).

### 7. After mutations: invalidate, don't manually update

```ts
useMutation({
  mutationFn: updateUser,
  onSuccess: (data) => qc.invalidateQueries({ queryKey: ['user', data.id] }),
});
```

Invalidate makes affected queries refetch. Manual `setQueryData` is faster but easy to get wrong (server-side mutators, denormalized fields, related entities). Default to invalidate; reach for `setQueryData` only when you've measured a real perf problem.

Decide where to invalidate: at the **specific** key (`user.detail(id)`) for surgical refresh, at the **parent** key (`user.all`) to flush every variant. Don't invalidate everything — that's an antipattern.

### 8. Optimistic updates have a strict order

```
onMutate:   cancelQueries  →  snapshot  →  setQueryData
onError:    rollback from snapshot
onSettled:  invalidate
```

Skip the `cancelQueries` step and an in-flight refetch can land **after** your optimistic write and clobber it. See [hooks/useUser.ts](src/hooks/useUser.ts) `useUpdateUserOptimistic`.

### 9. Where to put `onSuccess` / `onError`

- **Hook-level** (inside the `useMutation` definition): cache effects (invalidate, setQueryData). Runs every time, regardless of caller.
- **Call-site** (`mutate(input, { onSuccess })`): screen-specific effects (toasts, navigation, focus). Runs only for that call.

Mixing them is fine. Don't put screen-specific things at hook level — leaks UI concerns into shared code.

### 10. Pagination: use `placeholderData: keepPreviousData`

```ts
import { keepPreviousData } from '@tanstack/react-query';
useQuery({ ..., placeholderData: keepPreviousData });
```

While the next page loads, the previous page stays on screen instead of flashing a spinner. Massive UX win for tables and lists. (v4 used `keepPreviousData: true`; v5 changed the API.)

### 11. v4 → v5 migration gotchas

- `cacheTime` → **`gcTime`**
- `useQuery({ onSuccess, onError })` callbacks **removed from queries** (still on mutations). Move side-effects to `useEffect` that watches `data` / `error`, or to a global `QueryCache`/`MutationCache` `onError`.
- `keepPreviousData: true` → `placeholderData: keepPreviousData`
- `useQuery(['key'], fn, opts)` overload **removed**; only the object form is supported.
- `isLoading` → **`isPending`** (loading semantics changed: `isPending` = no data yet, `isFetching` = a request is in flight).

### 12. `refetchOnWindowFocus` — pick a side, per surface

`true` is great for dashboards (data is always fresh). `false` is mandatory for forms (a refocus mid-typing wiping the form is awful). The boilerplate defaults to `false` and you opt in per query.

### 13. Always create a fresh QueryClient in tests

Sharing one across tests leaks cache and produces order-dependent flakes. Use [test/createTestQueryClient.tsx](src/test/createTestQueryClient.tsx).

### 14. Typed errors

`useQuery` infers `error: TError = Error` by default. If your http layer throws a structured error (e.g. `HttpRequestError` from the companion boilerplate), declare it:

```ts
useQuery<User, HttpRequestError>({ ... });
```

Now `error.status`, `error.apiName`, etc. are available without casting in error UI.

### 15. Don't put non-serializable stuff in the cache

`Date`, `Map`, `Set`, class instances — react-query stores by reference, so they "work", but anything that looks at the cache (devtools, persisters, hydration boundaries) breaks. Keep cache shapes JSON-friendly.

### 16. Devtools in production

The provider lazy-loads `@tanstack/react-query-devtools/production` and gates them behind `window.toggleDevtools()`. You can debug a real user's session over a screenshare without redeploying. **Don't** import the dev devtools into prod bundles directly — they're large.

---

## Patterns reference

| Pattern | File |
| --- | --- |
| Provider with prod-toggleable devtools | [provider/QueryProvider.tsx](src/provider/QueryProvider.tsx) |
| Centralized query key factory | [keys/queryKeys.ts](src/keys/queryKeys.ts) |
| Plain async fetchers (no react-query) | [services/userService.ts](src/services/userService.ts) |
| Standard query with `staleTime` + `enabled` | [hooks/useUser.ts](src/hooks/useUser.ts) `useUser` |
| Lazy/manual query (`enabled: false` + `refetch`) | [hooks/useUser.ts](src/hooks/useUser.ts) `useUserProfileLazy` |
| Mutation with cache invalidation | [hooks/useUser.ts](src/hooks/useUser.ts) `useUpdateUser` |
| Optimistic update with rollback | [hooks/useUser.ts](src/hooks/useUser.ts) `useUpdateUserOptimistic` |
| Paginated list with `keepPreviousData` | [hooks/useOrders.ts](src/hooks/useOrders.ts) |
| Polling that stops on terminal state | [hooks/useJourneyPolling.ts](src/hooks/useJourneyPolling.ts) |
| Imperative invalidation | [hooks/useJourneyPolling.ts](src/hooks/useJourneyPolling.ts) `useInvalidateJourney` |
| Read + write screen | [examples/UserProfilePage.tsx](src/examples/UserProfilePage.tsx) |
| Prefetch + cache seed | [examples/prefetch.ts](src/examples/prefetch.ts) |
| Test client + RTL wrapper | [test/createTestQueryClient.tsx](src/test/createTestQueryClient.tsx) |

---

## When **not** to use react-query

- Pure local UI state (form inputs, modal open/close, theme) — use `useState` / Zustand / context.
- Real-time streams (WebSocket, SSE) — react-query *can* manage the resulting data, but the connection itself isn't a "query." Pair them; don't force the stream into a query.
- Next.js App Router server components doing `fetch` for cache — Next has its own cache and dedupes for you.

---

## Pairing with the http-handler boilerplate

This boilerplate's services use raw `fetch` for portability. In production, swap them for calls to the [http-handler](../http-handler/) wrapper — you get typed errors, retries, multi-service base URLs, and cancellation, which slot cleanly into the patterns above (especially the typed error tip in #14).
