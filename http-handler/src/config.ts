import type { Options } from 'ky';

/**
 * Per-service config: base URL + flags that switch off default behavior.
 * - skipDefaultHeaders: drop Content-Type/encoding (e.g. third-party API
 *   that rejects unexpected headers, or file uploads where browser must
 *   set its own multipart Content-Type with boundary).
 * - skipSessionHeaders: don't attach auth/session for public endpoints.
 * - timeoutMs: per-service override; falls back to global default.
 */
export type ServiceConfig = {
  baseUrl: string;
  skipDefaultHeaders?: boolean;
  skipSessionHeaders?: boolean;
  timeoutMs?: number;
};

/**
 * Resolver for auth/session headers. Sync or async.
 * Async lets you refresh tokens lazily before each call.
 */
export type SessionHeadersResolver = () =>
  | Options['headers']
  | Promise<Options['headers']>;

/**
 * Map endpoint string -> human-readable api name. Used in errors so
 * dashboards group by `apiName` instead of raw URL (path params noisy).
 */
export type ApiNameMap = Record<string, string>;

export type HttpHandlerConfig = {
  services: Record<string, ServiceConfig>;
  /** Headers attached to every request unless service opts out. */
  defaultHeaders?: Options['headers'];
  /** Resolver invoked before each request unless service opts out. */
  sessionHeaders?: SessionHeadersResolver;
  /** Friendly name lookup for error reporting. */
  apiNameMap?: ApiNameMap;
  /** Global default timeout (ms) when service doesn't override. */
  defaultTimeoutMs?: number;
};

let config: HttpHandlerConfig | null = null;

/**
 * Call once at app bootstrap before any httpRequest call.
 * Throwing on re-init would be hostile in HMR; we just overwrite.
 */
export function configureHttpHandler(c: HttpHandlerConfig): void {
  config = c;
}

export function getConfig(): HttpHandlerConfig {
  if (!config) {
    throw new Error(
      'http-handler not configured. Call configureHttpHandler() at bootstrap.',
    );
  }
  return config;
}
