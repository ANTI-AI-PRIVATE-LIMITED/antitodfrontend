/**
 * ANTITODE Plan & Tiering Configuration
 *
 * Sourced from the Product Launch Tiering Specification:
 * - Basic: 3 Honeypots, CSV export only, Community Feeds
 * - Pro: 10 Honeypots, CSV + JSON export (Task #78), Automated Scoring
 * - Enterprise: Unlimited Honeypots, STIX 2.1 + PDF + TAXII push, SOC connectors
 */

export type PlanTier = 'basic' | 'pro' | 'enterprise';

/** Plans are sold in Indian rupees: ₹6,500 style (en-IN grouping, no decimals). */
export const formatInr = (amount: number): string =>
  `₹${Math.round(amount).toLocaleString('en-IN')}`;

/**
 * Monthly price label for a plan returned by the billing API. Uses the server's INR price and
 * falls back to the local catalog, so an older backend that still sends USD never shows dollars.
 */
export const planPriceInr = (plan: { id?: string; priceInrPerMonth?: number | null }): number | null => {
  if (typeof plan.priceInrPerMonth === 'number' && plan.priceInrPerMonth > 0) return plan.priceInrPerMonth;
  const local = plan.id ? PLAN_TIERS[plan.id as PlanTier] : undefined;
  return local && local.priceMonthly > 0 ? local.priceMonthly : null;
};

export interface PlanConfig {
  id: PlanTier;
  name: string;
  badge: string;
  priceMonthly: number;
  billingPeriod: string;
  description: string;
  maxHoneypots: number;
  maxUsers: number;
  maxEventsPerMonth: number;
  retentionDays: number;
  exportFormats: Array<'CSV' | 'JSON' | 'STIX' | 'PDF'>;
  features: string[];
  popular?: boolean;
}

export const PLAN_TIERS: Record<PlanTier, PlanConfig> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    badge: 'Starter',
    priceMonthly: 6500,
    billingPeriod: '₹6,500 / month',
    description: 'Essential telemetry and honeypot monitoring for small setups and evaluation.',
    maxHoneypots: 15,
    maxUsers: 1,
    maxEventsPerMonth: 10000,
    retentionDays: 30,
    exportFormats: ['CSV'],
    features: [
      'Up to 15 active honeypots',
      '1 analyst seat included',
      'CSV log & indicator export',
      'Community threat intelligence feeds',
      'Standard 30-day log retention',
      'Real-time attack map view',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    badge: 'Recommended',
    priceMonthly: 14500,
    billingPeriod: '₹14,500 / month',
    description: 'Advanced threat intelligence, extended quotas, and structured JSON integrations.',
    maxHoneypots: 35,
    maxUsers: 3,
    maxEventsPerMonth: 100000,
    retentionDays: 90,
    exportFormats: ['CSV', 'JSON'],
    features: [
      'Up to 35 active honeypots',
      '3 analyst seats included',
      'JSON + CSV automated threat exports',
      'Automated threat scoring & heuristics',
      'MITRE ATT&CK technique mapping',
      '90-day forensic log history',
      'Priority alert webhooks',
    ],
    popular: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'Full Defense',
    priceMonthly: 0,
    billingPeriod: 'Contact Sales',
    description: 'Full-spectrum cyber defense, STIX 2.1 & TAXII sharing, and dedicated SOC connectors.',
    maxHoneypots: 9999,
    maxUsers: 9999,
    maxEventsPerMonth: 1000000,
    retentionDays: 90,
    exportFormats: ['CSV', 'JSON', 'STIX', 'PDF'],
    features: [
      'Unlimited honeypot deployments',
      'Unlimited analyst team seats',
      'Full STIX 2.1 bundle & PDF threat reports',
      'Built-in TAXII 2.1 server & remote push',
      '90-day extended forensics retention',
      'Custom YARA / Sigma detection rules',
      'Dedicated 24/7 SOC integration',
    ],
  },
};

const PLAN_STORAGE_KEY = 'antitode_active_plan';

/**
 * Get active plan from localStorage (defaults to 'basic' for launch demo).
 */
export function getStoredPlan(): PlanTier {
  try {
    const stored = localStorage.getItem(PLAN_STORAGE_KEY);
    if (stored === 'basic' || stored === 'pro' || stored === 'enterprise') {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }
  return 'basic';
}

/**
 * Persist user plan choice in localStorage.
 */
export function setStoredPlan(tier: PlanTier): void {
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, tier);
  } catch {
    // Ignore storage errors
  }
}
