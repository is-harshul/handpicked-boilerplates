/**
 * Structured error thrown for non-2xx HTTP responses.
 * Carries enough context (apiName, endpoint, method, service) so any
 * logger / error reporter can group + alert without parsing strings.
 */
export default class HttpRequestError extends Error {
  apiResponse: unknown;
  apiName: string;
  status: number;
  url: string;
  endpoint: string;
  method: string;
  service: string;

  constructor(
    message: string,
    apiResponse: unknown,
    apiName: string,
    status: number,
    url: string,
    endpoint: string,
    method: string,
    service: string,
    stack: string,
  ) {
    super(message);
    this.name = 'HttpRequestError';
    this.apiResponse = apiResponse;
    this.apiName = apiName;
    this.status = status;
    this.url = url;
    this.endpoint = endpoint;
    this.method = method;
    this.service = service;
    if (stack) this.stack = stack;
  }
}
