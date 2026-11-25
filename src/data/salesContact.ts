/** Where Enterprise / Contact Sales enquiries go. */
export const SALES_EMAIL = 'sales@antitode.ai';

/** mailto link for a sales enquiry. A contact address from the billing API wins when present. */
export const salesMailto = (contact?: string | null): string =>
  `mailto:${contact || SALES_EMAIL}?subject=${encodeURIComponent('ANTITODE Enterprise Plan Inquiry')}`;
