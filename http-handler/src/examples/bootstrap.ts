/**
 * Run once at app startup, before any httpRequest call.
 * In Next.js: top of `app/layout.tsx` (or a client provider).
 * In Vite/CRA: top of `main.tsx` / `index.tsx`.
 */
import { configureHttpHandler } from '../index';

configureHttpHandler({
  services: {
    onboarding: {
      baseUrl: process.env.APP_ONBOARDING_API_URL!,
      timeoutMs: 40000, // onboarding flows do heavy KYC work
    },
    transaction: {
      baseUrl: process.env.APP_TXN_API_URL!,
      timeoutMs: 15000,
    },
    search: {
      baseUrl: process.env.APP_SEARCH_API_URL!,
    },
    postal: {
      baseUrl: process.env.POSTAL_API_URL!,
      // Public third-party API: no auth, no custom Content-Type.
      skipDefaultHeaders: true,
      skipSessionHeaders: true,
    },
  },

  defaultHeaders: {
    'Content-Type': 'application/json',
    'accept-encoding': 'gzip, br',
    'x-client-source': 'web',
  },

  // Async resolver — refresh / read token lazily per request.
  sessionHeaders: async () => {
    const token = await getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  apiNameMap: {
    'user/:id/profile': 'GetUserProfile',
    'orders': 'CreateOrder',
  },

  defaultTimeoutMs: 15000,
});

async function getAuthToken(): Promise<string | null> {
  return localStorage.getItem('auth_token');
}
