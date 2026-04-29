import type { FeatureFlags } from '../../contracts';

/**
 * Acme has Auto-SIP rolled out, V2 landing live, and uses native
 * notifications. These are STATIC flags (decided at build time per
 * tenant). For dynamic flags use a runtime flag service — these two
 * concerns are different and shouldn't be mixed.
 */
export const featureFlags: FeatureFlags = {
  enableAutoSip: () => true,
  enableLandingPageV2: () => true,
  enableInAppNotifications: () => true,
};
