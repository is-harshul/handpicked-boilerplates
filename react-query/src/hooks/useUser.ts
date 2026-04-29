import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../keys/queryKeys';
import {
  fetchUser,
  fetchUserProfile,
  updateUser,
  type User,
} from '../services/userService';

/**
 * Read user by id.
 *
 * staleTime > 0 means: react-query will NOT refetch this query while it's
 * fresh, even on remount, even if a new component subscribes. Use it for
 * data that doesn't change often (user profile, feature flags, config).
 *
 * gcTime (formerly cacheTime) is how long unused data sits in memory
 * before garbage collection. Default 5 min is usually fine.
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.user.detail(id),
    queryFn: () => fetchUser(id),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(id), // skip query until id is truthy
  });
}

/**
 * Lazy/manual query — won't fire until you call `refetch()`.
 *
 * Use case: typeahead, on-demand prefill where the user clicks a button.
 * Setting `enabled: false` is the idiomatic way; do NOT mount the hook
 * conditionally (that violates rules of hooks).
 */
export function useUserProfileLazy(id: string) {
  return useQuery({
    queryKey: queryKeys.user.profile(id),
    queryFn: () => fetchUserProfile(id),
    enabled: false,
  });
}

/**
 * Update user. After success, invalidate the user detail query so any
 * mounted component reading it refetches fresh data.
 *
 * Why invalidate at the *parent* key (`user.all`) sometimes vs. the
 * specific key: invalidating `user.all` catches every list/detail
 * variant. Invalidating just `user.detail(id)` is surgical. Choose based
 * on how aggressively you want stale data flushed.
 */
export function useUpdateUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.user.detail(data.id) });
    },
  });
}

/**
 * Optimistic update example.
 *
 * Pattern (the only correct order — get this wrong and you race):
 *   1. onMutate: cancel in-flight queries, snapshot, write optimistic data
 *   2. onError:  roll back from snapshot
 *   3. onSettled: invalidate to reconcile with server truth
 *
 * The cancel step is critical: without it, an in-flight refetch can land
 * AFTER your optimistic write and clobber it.
 */
export function useUpdateUserOptimistic() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onMutate: async (input) => {
      const key = queryKeys.user.detail(input.id);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<User>(key);
      qc.setQueryData<User>(key, (old) =>
        old ? { ...old, name: input.name } : old,
      );
      return { previous, key };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: (_data, _err, input) => {
      qc.invalidateQueries({ queryKey: queryKeys.user.detail(input.id) });
    },
  });
}
