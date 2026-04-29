import type { TenantConstants } from '../../contracts';

const constants: TenantConstants = {
  brandName: 'Globex',
  primaryColor: '#10B981',
  supportEmail: 'support@globex.example',
  orderStatusMessages: {
    PLACED: 'Order received.',
    EXECUTED: 'Trade complete.',
    // Globex prefers a softer rejection wording for compliance.
    REJECTED: 'We could not place this order. Contact support if needed.',
    PENDING: 'Working on it…',
  },
};

export default constants;
export const { brandName, primaryColor, supportEmail, orderStatusMessages } =
  constants;
