import {
  httpRequest,
  cancellableHttpRequest,
  HttpRequestError,
  HttpRequestTimeOutError,
} from '../index';

type User = { id: string; name: string; email: string };
type Order = { id: string; amount: number; status: string };

// ---- 1. GET with path params + typed response -----------------------------
export async function getUser(id: string): Promise<User> {
  return httpRequest<User>({
    service: 'transaction',
    endpoint: 'user/:id/profile',
    method: 'GET',
    pathParams: { id },
  });
}

// ---- 2. GET with query string --------------------------------------------
export async function searchOrders(query: string, page: number) {
  return httpRequest<{ items: Order[]; total: number }>({
    service: 'search',
    endpoint: 'orders/search',
    method: 'GET',
    searchParams: { q: query, page },
  });
}

// ---- 3. POST with JSON body ----------------------------------------------
export async function createOrder(input: { amount: number; sku: string }) {
  return httpRequest<Order>({
    service: 'transaction',
    endpoint: 'orders',
    method: 'POST',
    json: input, // ky stringifies + sets Content-Type
  });
}

// ---- 4. File upload ------------------------------------------------------
export async function uploadKycDoc(file: File) {
  const form = new FormData();
  form.append('file', file);
  return httpRequest<{ docId: string }>({
    service: 'onboarding',
    endpoint: 'kyc/upload',
    method: 'POST',
    body: form,
    fileUpload: true, // browser sets multipart boundary itself
  });
}

// ---- 5. Retry on flaky endpoint ------------------------------------------
export async function fetchPincode(pincode: string) {
  return httpRequest<{ city: string; state: string }>({
    service: 'postal',
    endpoint: 'pincode/:pincode',
    method: 'GET',
    pathParams: { pincode },
    retry: { limit: 3, methods: ['get'], statusCodes: [408, 502, 503, 504] },
  });
}

// ---- 6. Cancellable typeahead --------------------------------------------
let inflight: ReturnType<typeof cancellableHttpRequest> | null = null;
export function searchTypeahead(q: string) {
  inflight?.cancelRequest();
  inflight = cancellableHttpRequest<{ items: Order[] }>({
    service: 'search',
    endpoint: 'typeahead',
    method: 'GET',
    searchParams: { q },
  });
  return inflight.sendRequest();
}

// ---- 7. Error handling ---------------------------------------------------
export async function safeGetUser(id: string) {
  try {
    return await getUser(id);
  } catch (err) {
    if (err instanceof HttpRequestError) {
      // status, apiName, url, endpoint, method available for logging
      if (err.status === 404) return null;
      reportToSentry(err);
    } else if (err instanceof HttpRequestTimeOutError) {
      reportToSentry(err);
    }
    throw err;
  }
}

declare function reportToSentry(err: Error): void;
