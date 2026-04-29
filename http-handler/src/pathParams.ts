export type PathParams = Record<string, string | number>;

/**
 * Replace `:token` segments in a route with values from pathParams.
 * Throws if a `:token` is left unreplaced — silent leaks lead to URLs
 * like `/user/:id/orders` hitting prod and 404ing in confusing ways.
 */
export function buildRoute(route: string, pathParams?: PathParams): string {
  if (!pathParams) return assertNoTokens(route);

  let out = route;
  for (const [key, value] of Object.entries(pathParams)) {
    const token = key.startsWith(':') ? key : `:${key}`;
    out = out.split(token).join(encodeURIComponent(String(value)));
  }
  return assertNoTokens(out);
}

function assertNoTokens(route: string): string {
  const leftover = route.match(/:[A-Za-z_][A-Za-z0-9_]*/);
  if (leftover) {
    throw new Error(
      `Unreplaced path param "${leftover[0]}" in route "${route}"`,
    );
  }
  return route;
}
