import ky, { HTTPError, TimeoutError, type Options } from 'ky';
import { getConfig } from './config';
import { buildRoute, type PathParams } from './pathParams';
import HttpRequestError from './errors/HttpRequestError';
import HttpRequestTimeOutError from './errors/HttpRequestTimeOutError';

export type HttpRequestParams = {
  /** Endpoint relative to service baseUrl. No leading `/`. */
  endpoint: string;
  /** Service key registered in configureHttpHandler({ services }). */
  service: string;
  /** Path params, e.g. { id: 42 } replaces `:id` in endpoint. */
  pathParams?: PathParams;
  /**
   * File upload flag. Skips Content-Type so the browser sets
   * multipart/form-data with the correct boundary itself.
   */
  fileUpload?: boolean;
} & Pick<
  Options,
  | 'body'
  | 'headers'
  | 'json'
  | 'method'
  | 'searchParams'
  | 'signal'
  | 'retry'
  | 'timeout'
>;

/**
 * ky default options. `cache: 'no-cache'` forces revalidation —
 * prevents stale 304s from masking backend changes during dev.
 * `keepalive: false` because keepalive requests are capped at 64KB
 * per origin and silently truncate large POSTs.
 */
const defaultKyOptions: Options = {
  cache: 'no-cache',
  keepalive: false,
};

const httpClient = ky.create(defaultKyOptions);

async function buildHeaders(
  service: string,
  fileUpload: boolean,
  additional: Options['headers'],
): Promise<Options['headers']> {
  const cfg = getConfig();
  const svc = cfg.services[service];
  if (!svc) throw new Error(`Unknown service "${service}"`);

  const skipDefault = fileUpload || svc.skipDefaultHeaders;
  const skipSession = svc.skipSessionHeaders;

  const session =
    !skipSession && cfg.sessionHeaders ? await cfg.sessionHeaders() : {};

  return {
    ...(skipDefault ? {} : cfg.defaultHeaders),
    ...session,
    ...additional,
  };
}

/**
 * One-call wrapper: resolves baseUrl, headers, path params, runs ky,
 * parses JSON, normalizes errors. Returns the parsed response body.
 *
 * Generic <T> lets callers type the response without casting:
 *   const user = await httpRequest<User>({ ... });
 */
export async function httpRequest<T = unknown>({
  endpoint,
  method,
  service,
  headers,
  pathParams,
  timeout,
  fileUpload = false,
  ...rest
}: HttpRequestParams): Promise<T> {
  const cfg = getConfig();
  const svc = cfg.services[service];
  if (!svc) throw new Error(`Unknown service "${service}"`);

  const prefixUrl = svc.baseUrl;
  const urlEndpoint = buildRoute(endpoint, pathParams);
  const reqHeaders = await buildHeaders(service, fileUpload, headers);
  const effectiveTimeout =
    timeout ?? svc.timeoutMs ?? cfg.defaultTimeoutMs ?? 15000;

  try {
    const response = await httpClient(urlEndpoint, {
      method,
      prefixUrl,
      headers: reqHeaders,
      timeout: effectiveTimeout,
      ...rest,
    });
    return (await response.json()) as T;
  } catch (err) {
    const apiName = cfg.apiNameMap?.[endpoint] ?? endpoint;

    if (err instanceof HTTPError) {
      // Body may not be JSON (HTML 502 page, empty 204, etc.). Fall
      // back to text so the error still carries diagnostic content.
      let body: unknown;
      try {
        body = await err.response.clone().json();
      } catch {
        body = await err.response.text().catch(() => '');
      }
      throw new HttpRequestError(
        err.message,
        body,
        apiName,
        err.response.status,
        urlEndpoint,
        endpoint,
        method || 'GET',
        service,
        err.stack || '',
      );
    }

    if (err instanceof TimeoutError) {
      throw new HttpRequestTimeOutError(
        err.message,
        err,
        apiName,
        408,
        urlEndpoint,
        endpoint,
        method || 'GET',
        service,
        err.stack || '',
      );
    }

    throw err;
  }
}

/**
 * Returns a paired { sendRequest, cancelRequest } so callers can abort
 * an in-flight request (e.g. on component unmount, on new keystroke
 * during typeahead). cancelRequest is bound so it survives destructure.
 */
export function cancellableHttpRequest<T = unknown>(
  request: Omit<HttpRequestParams, 'signal'>,
) {
  const controller = new AbortController();
  return {
    cancelRequest: () => controller.abort(),
    get cancelled() {
      return controller.signal.aborted;
    },
    sendRequest: () =>
      httpRequest<T>({ ...request, signal: controller.signal }),
  };
}
