export { default as QueryProvider, queryClient } from './provider/QueryProvider';
export { queryKeys } from './keys/queryKeys';

export {
  useUser,
  useUserProfileLazy,
  useUpdateUser,
  useUpdateUserOptimistic,
} from './hooks/useUser';
export { useOrders } from './hooks/useOrders';
export { useJourneyPolling, useInvalidateJourney } from './hooks/useJourneyPolling';

export { prefetchUser, seedUserCache } from './examples/prefetch';
export {
  createTestQueryClient,
  createWrapper,
} from './test/createTestQueryClient';

export type { JourneyStatus } from './hooks/useJourneyPolling';
