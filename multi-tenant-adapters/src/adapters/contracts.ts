import type { ComponentType } from 'react';

/**
 * The adapter contract.
 *
 * Every tenant folder under src/adapters/<tenant>/ must export a file
 * tree that satisfies this shape. The token __TENANT_ADAPTERS__ is
 * rewritten at build time to `~/adapters/<tenant>` — so there is no
 * runtime if/else, no per-tenant flag checks scattered through code.
 *
 * Why a contract: TypeScript can't enforce "this folder must exist"
 * across a build-time rewrite. So we declare the shape once here and
 * have every tenant export a typed manifest (see adapters/<x>/index.ts)
 * that satisfies it. Add a new component to the contract → all tenants
 * fail to compile until they implement it. That's the point.
 */

export type FeatureFlags = {
  enableAutoSip: () => boolean;
  enableLandingPageV2: () => boolean;
  enableInAppNotifications: () => boolean;
};

export type TenantConstants = {
  /** Used in titles, emails, voiceover. */
  brandName: string;
  /** Hex/CSS color for primary brand surfaces. */
  primaryColor: string;
  supportEmail: string;
  /** Map of order-status code → user-facing message. Lets tenants
   *  reword sensitive states (e.g. "REJECTED" wording). */
  orderStatusMessages: Record<string, string>;
};

export type TenantAdapter = {
  Header: ComponentType;
  Footer: ComponentType;
  constants: TenantConstants;
  featureFlags: FeatureFlags;
};
