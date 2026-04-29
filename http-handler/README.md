# http-handler

A plug-and-play HTTP wrapper built on [`ky`](https://github.com/sindresorhus/ky). Drop the `src/` folder into a project, configure once, call `httpRequest` everywhere.

Battle-tested in production at a fintech (mutual-funds platform). This boilerplate is a generic distillation — env vars, smallcase-specific imports and the project's auth utils have been replaced by a small config API.

---

## Why this wrapper

`fetch` and `axios` both work. So why a wrapper?

| Concern | `fetch` | `axios` | This wrapper |
| --- | --- | --- | --- |
| Throws on non-2xx | No (you check `res.ok`) | Yes | Yes (typed `HttpRequestError`) |
| Auto JSON parse | No | Yes | Yes |
| Timeout built-in | No (AbortController dance) | Yes | Yes (per-service + global default) |
| Retry built-in | No | No (needs `axios-retry`) | Yes (ky native) |
| Multi-service base URLs | Manual | One instance per service | First-class (`services` config) |
| Path-param interpolation | Manual | Manual | Built-in, throws on unreplaced `:tokens` |
| Cancellation ergonomics | Manual `AbortController` | `CancelToken` (deprecated) → AbortController | `cancellableHttpRequest()` pair |
| Normalized error shape | No | `AxiosError` (verbose) | `HttpRequestError` / `HttpRequestTimeOutError` with `apiName`, `endpoint`, `service`, `status` for grouping in Sentry/Datadog |
| Bundle size | 0 | ~14kb min+gz | ~4kb (ky) |
| File-upload Content-Type quirk | Manual | Manual | `fileUpload: true` flag |
| Public-API services (no auth) | Manual | Manual | `skipSessionHeaders` per service |

The point is not "fetch is bad." The point is that **every codebase ends up reinventing the same five concerns** — base URLs, auth headers, timeouts, retries, error normalization. This file centralizes all of them so feature code stays declarative.

---

## Why `ky` (not axios)

- **Smaller** (~4kb vs axios ~14kb) and built on native `fetch` — works in Node 18+, browsers, edge runtimes (Cloudflare Workers, Vercel Edge), service workers. Axios still ships its own XHR/Node adapters.
- **Native** `Request`/`Response`/`AbortController` — no proprietary `CancelToken`, no axios interceptor types to learn.
- **Retry**, **timeout**, **hooks**, **prefixUrl**, **searchParams** all first-class. With axios you bolt on `axios-retry`.
- **Streaming** — ky returns native `Response`, so `response.body` is a real `ReadableStream`. Useful for SSE, large downloads, AI token streams.

---

## Install

```bash
npm install ky
```

Then copy the [src/](src/) folder into your project (e.g. `src/lib/http/`). It has no other deps.

---

## Quick start

### 1. Configure once at bootstrap

See [src/examples/bootstrap.ts](src/examples/bootstrap.ts).

```ts
import { configureHttpHandler } from './lib/http';

configureHttpHandler({
  services: {
    api:  { baseUrl: process.env.API_URL!, timeoutMs: 15000 },
    auth: { baseUrl: process.env.AUTH_URL!, timeoutMs: 40000 },
    geo:  { baseUrl: 'https://api.postalpincode.in',
            skipDefaultHeaders: true, skipSessionHeaders: true },
  },
  defaultHeaders: { 'Content-Type': 'application/json' },
  sessionHeaders: async () => ({
    Authorization: `Bearer ${await getToken()}`,
  }),
  apiNameMap: { 'user/:id/profile': 'GetUserProfile' },
  defaultTimeoutMs: 15000,
});
```

### 2. Use it anywhere

See [src/examples/usage.ts](src/examples/usage.ts) for all patterns.

```ts
import { httpRequest } from './lib/http';

const user = await httpRequest<User>({
  service: 'api',
  endpoint: 'user/:id/profile',
  method: 'GET',
  pathParams: { id: '42' },
});
```

---

## Feature reference

### Multi-service base URLs

`services` is a registry. Each entry is independent — different base URL, different timeout, different header policy. Add a new microservice in one place; feature code just passes `service: 'newThing'`.

### Path params with safety

`pathParams` replaces `:tokens` in the endpoint, URL-encodes values, and **throws if any token is left unreplaced**. Prevents URLs like `/user/:id/orders` quietly hitting prod and 404ing.

### Headers strategy

Three layers, merged in this order (later overrides earlier):

1. `defaultHeaders` (global) — unless `fileUpload: true` or `skipDefaultHeaders` on service.
2. `sessionHeaders()` resolver — unless `skipSessionHeaders` on service.
3. `headers` passed at call site.

`sessionHeaders` may be **async** so you can refresh tokens lazily before each request. The resolver is invoked per request, not cached — keep it cheap or memoize internally.

### `fileUpload: true`

When you `body: formData`, the browser must set `Content-Type: multipart/form-data; boundary=...` itself. If you force `Content-Type: application/json` via defaults, the request body parses incorrectly server-side. Setting `fileUpload: true` skips default headers for that one call.

### Timeouts

Resolution: call-site `timeout` → `services[svc].timeoutMs` → `defaultTimeoutMs` → `15000`. Onboarding/KYC flows often need 30–60s; user-facing reads should stay tight (5–10s) so failures surface fast.

### Retries

ky-native via the `retry` option per call. Retries are off by default — opt in for idempotent endpoints only.

```ts
retry: { limit: 3, methods: ['get'], statusCodes: [408, 502, 503, 504] }
```

Retries respect `Retry-After` headers automatically. Don't retry POSTs unless they're idempotent.

### Cancellation

```ts
const req = cancellableHttpRequest<Result>({ service, endpoint, method: 'GET' });
const promise = req.sendRequest();
// later:
req.cancelRequest();
```

Pattern shown in [usage.ts](src/examples/usage.ts) section 6 (typeahead) — cancel previous in-flight before firing new one to prevent older response clobbering newer.

### Typed responses

```ts
const user = await httpRequest<User>({ ... });   // user: User
```

No casting, no `as`. Generic defaults to `unknown` so untyped calls force you to narrow before use.

### Normalized errors

Every non-2xx → `HttpRequestError` with:

```ts
{
  message, status, url, endpoint, method, service, apiName, apiResponse
}
```

Every ky timeout → `HttpRequestTimeOutError` (status 408 by convention).

Why this matters: Sentry/Datadog can group by `apiName` + `service` instead of raw URL (path params blow up cardinality). Alerts and dashboards stay clean.

```ts
try { ... }
catch (e) {
  if (e instanceof HttpRequestError && e.status === 404) return null;
  if (e instanceof HttpRequestTimeOutError) reportTimeout(e);
  throw e;
}
```

The wrapper falls back to text body if the error response isn't JSON (HTML 502 pages, empty 204s) — so you never lose diagnostic content.

---

## Defaults explained

```ts
const defaultKyOptions = { cache: 'no-cache', keepalive: false };
```

- **`cache: 'no-cache'`** — forces revalidation against the origin. Stops stale 304s from masking backend changes during dev. If you specifically want CDN/browser caching, override per-call.
- **`keepalive: false`** — keepalive requests are capped at **64KB per origin** by the spec and silently truncate large POSTs. Off by default; turn on only for tiny beacon-style requests (analytics on `pagehide`).

---

## File layout

```
http-handler/
├── README.md
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                ← public API
    ├── httpHandler.ts          ← httpRequest + cancellableHttpRequest
    ├── config.ts               ← configureHttpHandler + types
    ├── pathParams.ts           ← :token interpolation
    ├── errors/
    │   ├── HttpRequestError.ts
    │   └── HttpRequestTimeOutError.ts
    └── examples/
        ├── bootstrap.ts        ← one-time config
        └── usage.ts            ← 7 patterns: GET, query, POST, upload, retry, cancel, error-handling
```

---

## When **not** to use this

- One-off `fetch` to a single endpoint in a script — overkill.
- You need axios-specific features (request/response interceptors with mutable config, `transformRequest`/`transformResponse` chains). ky has hooks but the API is different.
- React Server Components doing `fetch` for Next.js cache integration — use raw `fetch` so Next can dedupe + cache.

For everything else — SPAs, dashboards, mobile webviews, micro-frontends talking to many services — this wrapper pays for itself within the first sprint.

---

## Extending

Common extensions, in order of how often you'll want them:

1. **Request ID / trace headers** — add to `defaultHeaders` or generate per-request inside `sessionHeaders`.
2. **Global error reporter** — catch in a thin wrapper around `httpRequest` and call your reporter before rethrowing. Don't put it inside the handler — keeps the lib free of telemetry deps.
3. **Response interceptors** — use ky's [`hooks.afterResponse`](https://github.com/sindresorhus/ky#hooksafterresponse) on the `httpClient` in `httpHandler.ts`. Common use: 401 → refresh token → retry once.
4. **Mock layer for tests** — swap `httpClient` with a `ky.create({ fetch: mockFetch })` instance in test setup.
