import type { FeatureFlags } from '../../contracts';

/**
 * Globex hasn't rolled out auto-SIP and is on the V1 landing page.
 * Same hooks/components in app code — different on/off here.
 */
export const featureFlags: FeatureFlags = {
  enableAutoSip: () => false,
  enableLandingPageV2: () => false,
  enableInAppNotifications: () => true,
};
