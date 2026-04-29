import type { TenantConstants } from '~/adapters/contracts';
// @ts-expect-error - token resolved at build time
import * as tenantConstants from '__TENANT_ADAPTERS__/constants';

// Re-typed through the contract so consumers get strict types.
const constants = tenantConstants as unknown as TenantConstants & {
  default: TenantConstants;
};

// Tenants export both `default` and named exports. Prefer the default
// for the full object; named ones for terse imports at call sites.
export default (constants.default ?? constants) as TenantConstants;
