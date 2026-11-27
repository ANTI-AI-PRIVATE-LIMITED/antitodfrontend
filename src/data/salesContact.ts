/**
 * Where Enterprise / Contact Sales enquiries go. Defaults to the shared support inbox on
 * antiai.ltd (a domain with working MX records); set VITE_SALES_EMAIL to use another address.
 */
export const SALES_EMAIL: string =
  ((import.meta as any).env?.VITE_SALES_EMAIL as string | undefined)?.trim() || 'support@antiai.ltd';

/** mailto link for a sales enquiry. A contact address from the billing API wins when present. */
export const salesMailto = (contact?: string | null): string =>
  `mailto:${contact || SALES_EMAIL}?subject=${encodeURIComponent('ANTITODE Enterprise Plan Inquiry')}`;
