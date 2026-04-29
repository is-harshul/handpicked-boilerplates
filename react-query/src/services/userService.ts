/**
 * Plain async functions. No react-query, no React. These are the units
 * react-query orchestrates.
 *
 * Why separate: lets you reuse the same fetcher in non-React contexts
 * (cron scripts, SSR, prefetch, tests) and keeps hooks free of fetch
 * internals. Easy to mock in tests by stubbing this module.
 *
 * In a real project these would call your http wrapper (e.g. the
 * companion `http-handler` boilerplate). Here we stub with fetch.
 */

export type User = { id: string; name: string; email: string };
export type UserProfile = User & { kycStatus: 'PENDING' | 'VERIFIED' };
export type Order = { id: string; amount: number; status: string };

export async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/user/${id}`);
  if (!res.ok) throw new Error(`fetchUser failed: ${res.status}`);
  return res.json();
}

export async function fetchUserProfile(id: string): Promise<UserProfile> {
  const res = await fetch(`/api/user/${id}/profile`);
  if (!res.ok) throw new Error(`fetchUserProfile failed: ${res.status}`);
  return res.json();
}

export async function updateUser(input: {
  id: string;
  name: string;
}): Promise<User> {
  const res = await fetch(`/api/user/${input.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: input.name }),
  });
  if (!res.ok) throw new Error(`updateUser failed: ${res.status}`);
  return res.json();
}

export async function fetchOrders(filters: {
  status?: string;
  page?: number;
}): Promise<{ items: Order[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  const res = await fetch(`/api/orders?${params}`);
  if (!res.ok) throw new Error(`fetchOrders failed: ${res.status}`);
  return res.json();
}

export type JourneyStatus = 'KYC_PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export async function fetchJourney(): Promise<{ status: JourneyStatus }> {
  const res = await fetch(`/api/journey`);
  if (!res.ok) throw new Error(`fetchJourney failed: ${res.status}`);
  return res.json();
}
