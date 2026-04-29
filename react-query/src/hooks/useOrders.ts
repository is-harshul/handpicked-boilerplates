import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '../keys/queryKeys';
import { fetchOrders } from '../services/userService';

/**
 * Paginated/filtered list with smooth UX.
 *
 * placeholderData: keepPreviousData → while a new page is loading, keep
 * showing the previous page's data instead of flashing a spinner. Hugely
 * better UX for paginated tables. (v4 was `keepPreviousData: true`; v5
 * changed to `placeholderData: keepPreviousData`.)
 *
 * The full filters object goes into the queryKey so each filter combo
 * gets its own cache entry — switching back is instant from cache.
 */
export function useOrders(filters: { status?: string; page?: number }) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => fetchOrders(filters),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}
