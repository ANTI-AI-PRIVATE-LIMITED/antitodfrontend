import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  DEMO_BILLING_HISTORY,
  DEMO_BILLING_PLANS,
  DEMO_BILLING_USAGE,
  DEMO_CONNECTORS,
  DEMO_INTEL_FEED_PREVIEW,
  DEMO_RBAC_GROUPS,
  DEMO_RBAC_PERMISSIONS,
  DEMO_RBAC_USERS,
  DEMO_SOAR_ALERTS,
  DEMO_SUBSCRIPTION,
} from '../data/demo/governanceAndBilling';

const readFile = (relFromRoot: string): string =>
  fs.readFileSync(path.resolve(__dirname, '../../', relFromRoot), 'utf8');

describe('BUG-014 & BUG-015: Public Demo Billing, Access Control & Integrations Previews', () => {
  test('demo governance and billing fixtures are well-formed and contain no real secrets or production IPs', () => {
    expect(DEMO_BILLING_USAGE.platform).toBe(false);
    expect(DEMO_BILLING_USAGE.plan?.id).toBe('pro');
    expect(DEMO_BILLING_PLANS.plans.length).toBeGreaterThanOrEqual(3);
    expect(DEMO_BILLING_HISTORY.events.length).toBeGreaterThanOrEqual(2);
    expect(DEMO_SUBSCRIPTION.razorpaySubscriptionId).toBeNull();

    expect(DEMO_RBAC_PERMISSIONS.length).toBeGreaterThanOrEqual(5);
    expect(DEMO_RBAC_GROUPS.length).toBeGreaterThanOrEqual(3);
    expect(DEMO_RBAC_USERS.length).toBeGreaterThanOrEqual(3);

    expect(DEMO_CONNECTORS.length).toBeGreaterThanOrEqual(2);
    for (const c of DEMO_CONNECTORS) {
      expect(c.endpointUrl.startsWith('https://')).toBe(true);
      expect(c.endpointUrl).toContain('.example');
      expect((c as unknown as Record<string, unknown>).authToken).toBeUndefined();
      expect((c as unknown as Record<string, unknown>).password).toBeUndefined();
      expect((c as unknown as Record<string, unknown>).secret).toBeUndefined();
    }
    expect(DEMO_INTEL_FEED_PREVIEW.indicators.length).toBeGreaterThanOrEqual(3);
    expect(DEMO_SOAR_ALERTS.length).toBeGreaterThanOrEqual(2);

    const fixtureSrc = readFile('src/data/demo/governanceAndBilling.ts');
    expect(fixtureSrc).not.toContain('13.233.163.244');
    expect(fixtureSrc).not.toContain('deqoy');
  });

  test('BillingView short-circuits live billing API calls in public demo mode and disables mutations', () => {
    const billingSrc = readFile('components/views/BillingView.tsx');
    expect(billingSrc).toContain('isPublicDemo()');
    expect(billingSrc).toContain('DEMO_BILLING_USAGE');
    expect(billingSrc).toContain('DEMO_BILLING_PLANS');
    expect(billingSrc).toContain('DEMO_BILLING_HISTORY');
    expect(billingSrc).toContain('DEMO_SUBSCRIPTION');
    expect(billingSrc).toContain('const canManageBilling = !demoMode && can(\'rbac.users.manage\');');
    expect(billingSrc).toContain('if (isPublicDemo()) return;');
    expect(billingSrc).toContain('data-testid="billing-demo-banner"');
    expect(billingSrc).toContain('DEMO SANDBOX');
  });

  test('ViewRouter and IntegrationsView permit read-only demo preview while preserving live RBAC restrictions', () => {
    const routerSrc = readFile('src/components/ViewRouter.tsx');
    expect(routerSrc).toContain('const demoMode = isPublicDemo();');
    expect(routerSrc).toContain("const hasIntegrationsAccess = demoMode || permissions.some((p) => p.startsWith('integrations.'));");
    expect(routerSrc).toContain('{!demoMode && !permissionsLoaded ? (');

    const intSrc = readFile('components/views/IntegrationsView.tsx');
    expect(intSrc).toContain("const hasModuleAccess = demoMode || permissions.some((p) => p.startsWith('integrations.'));");
    expect(intSrc).toContain("const canManageConnectors = !demoMode && can('integrations.connectors.manage');");
    expect(intSrc).toContain("const canPushConnectors = !demoMode && can('integrations.connectors.push');");
    expect(intSrc).toContain('DEMO_CONNECTORS');
    expect(intSrc).toContain('DEMO_INTEL_FEED_PREVIEW');
    expect(intSrc).toContain('DEMO_SOAR_ALERTS');
    expect(intSrc).toContain('data-testid="integrations-demo-banner"');
    expect(intSrc).toContain('Access Restricted');
  });

  test('AccessControlView hydrates read-only RBAC demo lists and disables mutations in public demo mode', () => {
    const acSrc = readFile('components/views/AccessControlView.tsx');
    expect(acSrc).toContain('const isPlatform = !demoMode && !admin?.CustomerID;');
    expect(acSrc).toContain("const canViewUsers = demoMode || can('rbac.users.manage');");
    expect(acSrc).toContain("const canViewGroups = demoMode || can('rbac.groups.manage');");
    expect(acSrc).toContain("const canManageUsers = !demoMode && can('rbac.users.manage');");
    expect(acSrc).toContain("const canManageGroups = !demoMode && can('rbac.groups.manage');");
    expect(acSrc).toContain('setPermissions(DEMO_RBAC_PERMISSIONS);');
    expect(acSrc).toContain('setGroups(DEMO_RBAC_GROUPS);');
    expect(acSrc).toContain('setUsers(DEMO_RBAC_USERS);');
    expect(acSrc).toContain('data-testid="access-control-demo-banner"');
  });
});
