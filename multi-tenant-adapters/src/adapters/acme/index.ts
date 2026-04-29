/**
 * Tenant manifest. Not imported by app code (the app uses adapter
 * service facades + the __TENANT_ADAPTERS__ token). Exists so this
 * tenant's exports can be type-checked against TenantAdapter — if a
 * required surface is missing, this file fails to compile.
 */
import type { TenantAdapter } from '../contracts';
import Header from './Header';
import Footer from './Footer';
import constants from './constants';
import { featureFlags } from './featureFlags';

const adapter: TenantAdapter = { Header, Footer, constants, featureFlags };
export default adapter;
