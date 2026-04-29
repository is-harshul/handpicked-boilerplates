import type { TenantConstants } from '../../contracts';

const constants: TenantConstants = {
  brandName: 'Acme Invest',
  primaryColor: '#0B5FFF',
  supportEmail: 'help@acmeinvest.example',
  orderStatusMessages: {
    PLACED: 'Your order has been placed.',
    EXECUTED: 'Order successful.',
    REJECTED: "Order couldn't go through. Please try again.",
    PENDING: 'Order is being processed.',
  },
};

export default constants;
// Re-export individual constants for tenants that prefer named imports
export const { brandName, primaryColor, supportEmail, orderStatusMessages } =
  constants;
