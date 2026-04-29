import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../keys/queryKeys';
import { fetchJourney, type JourneyStatus } from '../services/userService';

/**
 * Polling pattern (KYC/onboarding status, payment confirmation, etc.).
 *
 * refetchInterval can be a number OR a function. Using the function form
 * lets you stop polling once a terminal state is reached — otherwise the
 * tab keeps hammering the server forever.
 *
 * refetchIntervalInBackground: true continues polling when the tab isn't
 * focused. Default false saves battery; turn on for flows where the
 * server transitions state without user interaction (CAN creation,
 * payment confirmation).
 */
export function useJourneyPolling({
  enabled = true,
  intervalMs = 3000,
}: { enabled?: boolean; intervalMs?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.journey.current(),
    queryFn: fetchJourney,
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'COMPLETED') return false; // stop polling
      return intervalMs;
    },
    refetchIntervalInBackground: true,
  });
}

/**
 * Imperatively invalidate the journey query — use after a step completes
 * so the UI reflects the new server state without a manual refresh.
 *
 * Returned as a stable function so it's safe to put in deps arrays.
 */
export function useInvalidateJourney() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.journey.all });
}

export type { JourneyStatus };
