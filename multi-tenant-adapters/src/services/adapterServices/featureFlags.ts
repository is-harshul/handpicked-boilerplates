import type { FeatureFlags } from '~/adapters/contracts';
// @ts-expect-error - token resolved at build time
import { featureFlags } from '__TENANT_ADAPTERS__/featureFlags';

export default featureFlags as FeatureFlags;
