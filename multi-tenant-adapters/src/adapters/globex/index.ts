import type { TenantAdapter } from '../contracts';
import Header from './Header';
import Footer from './Footer';
import constants from './constants';
import { featureFlags } from './featureFlags';

const adapter: TenantAdapter = { Header, Footer, constants, featureFlags };
export default adapter;
