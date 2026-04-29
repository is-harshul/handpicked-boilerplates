import { queryClient } from '../provider/QueryProvider';
import { queryKeys } from '../keys/queryKeys';
import { fetchUser } from '../services/userService';

/**
 * Imperative prefetch — call from a route loader, link hover, or
 * just-before-navigation hook. Data lands in cache; the next useUser()
 * call resolves synchronously instead of triggering a spinner.
 *
 * Same key + same fetcher as the hook → react-query dedupes and there's
 * one network call, not two.
 */
export function prefetchUser(id: string) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.user.detail(id),
    queryFn: () => fetchUser(id),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Seed the cache directly from a known payload (e.g. from SSR, from a
 * list response that already contains the detail object). Avoids an
 * extra round-trip when navigating list → detail.
 */
export function seedUserCache(user: { id: string; name: string; email: string }) {
  queryClient.setQueryData(queryKeys.user.detail(user.id), user);
}
