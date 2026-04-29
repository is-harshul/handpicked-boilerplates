/**
 * Thrown when ky's internal timeout fires before response received.
 * Mapped to HTTP 408 by convention so reporting tools treat it like
 * a server-side timeout even though it originates client-side.
 */
export default class HttpRequestTimeOutError extends Error {
  originalError: Error;
  apiName: string;
  status: number;
  url: string;
  endpoint: string;
  method: string;
  service: string;

  constructor(
    message: string,
    originalError: Error,
    apiName: string,
    status: number,
    url: string,
    endpoint: string,
    method: string,
    service: string,
    stack: string,
  ) {
    super(message);
    this.name = 'HttpRequestTimeOutError';
    this.originalError = originalError;
    this.apiName = apiName;
    this.status = status;
    this.url = url;
    this.endpoint = endpoint;
    this.method = method;
    this.service = service;
    if (stack) this.stack = stack;
  }
}
