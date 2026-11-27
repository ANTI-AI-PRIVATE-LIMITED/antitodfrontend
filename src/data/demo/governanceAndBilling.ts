import type {
  BillingHistoryResponse,
  BillingPlansResponse,
  BillingUsage,
  SubscriptionStatus,
} from '../../../api/services/billingService';
import type {
  RbacGroup,
  RbacPermission,
  RbacUser,
} from '../../../api/services/rbacService';
import type {
  AsmConnector,
  IntelFeedPreview,
  SoarAlert,
} from '../../../api/services/integrationsService';

/**
 * Deterministic read-only sandbox datasets for public demo mode (`?demo=true`).
 * Avoids firing authenticated admin/billing/RBAC/integrations API requests while
 * demonstrating realistic product state without any production customer identifiers.
 */

export const DEMO_BILLING_USAGE: BillingUsage = {
  platform: false,
  customer: {
    CustomerID: 'demo-sandbox',
    Name: 'ANTITODE Demo Sandbox',
  },
  plan: {
    id: 'pro',
    label: 'Pro',
    priceUsdPerMonth: 199,
    status: 'active',
    active: true,
    paidUntil: '2026-12-31T00:00:00Z',
    daysLeft: 30,
  },
  usage: {
    servers: { used: 3, limit: 15, percent: 20 },
    honeypots: { used: 6, limit: 30, percent: 20 },
    users: { used: 4, limit: 25, percent: 16 },
  },
  retentionDays: 90,
  exportFormats: ['json', 'stix', 'cef', 'csv'],
  warnings: [],
  upgrade: {
    available: true,
    nextPlan: 'enterprise',
    priceUsdPerMonth: 499,
    message: 'Upgrade to Enterprise for unlimited sensors and dedicated TAXII streams.',
  },
};

export const DEMO_BILLING_PLANS: BillingPlansResponse = {
  currentPlan: 'pro',
  contact: 'sales@xyberah.example',
  plans: [
    {
      id: 'basic',
      label: 'Basic',
      priceUsdPerMonth: 49,
      maxServers: 5,
      maxUsers: 10,
      retentionDays: 30,
      exportFormats: ['json', 'csv'],
    },
    {
      id: 'pro',
      label: 'Pro',
      priceUsdPerMonth: 199,
      maxServers: 15,
      maxUsers: 25,
      retentionDays: 90,
      exportFormats: ['json', 'stix', 'cef', 'csv'],
      current: true,
    },
    {
      id: 'enterprise',
      label: 'Enterprise',
      priceUsdPerMonth: 499,
      maxServers: 100,
      maxUsers: 100,
      retentionDays: 365,
      exportFormats: ['json', 'stix', 'cef', 'csv'],
    },
  ],
};

export const DEMO_BILLING_HISTORY: BillingHistoryResponse = {
  platform: false,
  events: [
    {
      type: 'plan.renewed',
      label: 'Pro Tier Sandbox Preview Active (Read-Only Demo)',
      at: '2026-11-01T00:00:00Z',
    },
    {
      type: 'workspace.provisioned',
      label: 'Demo workspace quotas initialized (15 sensors / 25 seats)',
      at: '2026-10-15T09:30:00Z',
    },
  ],
};

export const DEMO_SUBSCRIPTION: SubscriptionStatus = {
  platform: false,
  customerId: 'demo-sandbox',
  plan: 'pro',
  planStatus: 'active',
  paidUntil: '2026-12-31T00:00:00Z',
  razorpayCustomerId: null,
  razorpaySubscriptionId: null,
  gatewayConfigured: true,
  remote: null,
};

export const DEMO_RBAC_PERMISSIONS: RbacPermission[] = [
  {
    PermissionId: 'osm.module.access',
    Description: 'Inspect attack surface reconnaissance targets and findings (read-only)',
    Module: 'osm',
  },
  {
    PermissionId: 'ioc.view',
    Description: 'View curated indicators of compromise and detection tags',
    Module: 'ioc',
  },
  {
    PermissionId: 'threat_intel.view',
    Description: 'Browse exploit feeds, CVE advisories, and threat actor intelligence',
    Module: 'threat_intel',
  },
  {
    PermissionId: 'infrastructure.view',
    Description: 'Monitor registered honeypot nodes, log shippers, and sensor telemetry',
    Module: 'infrastructure',
  },
  {
    PermissionId: 'threat_map.view',
    Description: 'Open live telemetry map and attacker origin analytics',
    Module: 'threat_map',
  },
  {
    PermissionId: 'integrations.connectors.view',
    Description: 'Inspect configured SIEM, SOAR, and TAXII export connectors',
    Module: 'integrations',
  },
  {
    PermissionId: 'rbac.groups.view',
    Description: 'Review role groups and permission assignments',
    Module: 'rbac',
  },
];

export const DEMO_RBAC_GROUPS: RbacGroup[] = [
  {
    GroupId: 'demo-grp-analysts',
    Name: 'SOC Analysts',
    Description: 'Triage honeypot telemetry, threat feeds, and IOC lists',
    permissionIds: ['ioc.view', 'threat_intel.view', 'threat_map.view', 'infrastructure.view'],
  },
  {
    GroupId: 'demo-grp-recon',
    Name: 'ASM & Integrations Operators',
    Description: 'Review external attack surface scans and SIEM/SOAR connector health',
    permissionIds: ['osm.module.access', 'integrations.connectors.view', 'ioc.view'],
  },
  {
    GroupId: 'demo-grp-readonly',
    Name: 'Demo Sandbox Auditors',
    Description: 'Read-only preview role for evaluating platform governance and visibility',
    permissionIds: ['rbac.groups.view', 'threat_intel.view', 'threat_map.view'],
  },
];

export const DEMO_RBAC_USERS: RbacUser[] = [
  {
    AdminID: 'demo-usr-01',
    AdminEmail: 'demo@xyberah.com',
    IsActive: true,
    groups: [
      {
        GroupId: 'demo-grp-readonly',
        Name: 'Demo Sandbox Auditors',
        Description: 'Read-only preview role for evaluating platform governance and visibility',
      },
    ],
    permissions: ['rbac.groups.view', 'threat_intel.view', 'threat_map.view'],
  },
  {
    AdminID: 'demo-usr-02',
    AdminEmail: 'soc-lead@xyberah.example',
    IsActive: true,
    groups: [
      {
        GroupId: 'demo-grp-analysts',
        Name: 'SOC Analysts',
        Description: 'Triage honeypot telemetry, threat feeds, and IOC lists',
      },
    ],
    permissions: ['ioc.view', 'threat_intel.view', 'threat_map.view', 'infrastructure.view'],
  },
  {
    AdminID: 'demo-usr-03',
    AdminEmail: 'secops@xyberah.example',
    IsActive: true,
    groups: [
      {
        GroupId: 'demo-grp-recon',
        Name: 'ASM & Integrations Operators',
        Description: 'Review external attack surface scans and SIEM/SOAR connector health',
      },
    ],
    permissions: ['osm.module.access', 'integrations.connectors.view', 'ioc.view'],
  },
];

export const DEMO_CONNECTORS: AsmConnector[] = [
  {
    id: 'demo-conn-splunk',
    name: 'Splunk HEC — Production Telemetry',
    type: 'splunk_hec',
    format: 'json',
    endpointUrl: 'https://siem.soc.example:8088/services/collector/event',
    authHeader: 'Authorization',
    hasAuthToken: true,
    hasPassword: false,
    hasSecret: false,
    enabled: true,
    includeAsm: true,
    includeHoneypot: true,
    minRiskLevel: 'medium',
    lastPushAt: '2026-11-26T09:15:00Z',
    lastPushStatus: 'success',
    lastPushError: null,
  },
  {
    id: 'demo-conn-soar',
    name: 'SOAR Playbook Webhook',
    type: 'soar',
    format: 'stix',
    endpointUrl: 'https://soar.soc.example/api/webhooks/antitode',
    authHeader: 'X-Antitode-Signature',
    hasAuthToken: false,
    hasPassword: false,
    hasSecret: true,
    enabled: true,
    includeAsm: true,
    includeHoneypot: false,
    minRiskLevel: 'high',
    lastPushAt: '2026-11-26T08:40:00Z',
    lastPushStatus: 'success',
    lastPushError: null,
  },
];

export const DEMO_INTEL_FEED_PREVIEW: IntelFeedPreview = {
  indicatorCount: 3,
  contentType: 'application/json',
  indicators: [
    {
      type: 'ipv4-addr',
      value: '198.51.100.42',
      riskLevel: 'critical',
      threatScore: 92,
      source: 'honeypot',
      title: 'SSH brute-force scanner observed on edge-sensor-01',
    },
    {
      type: 'ipv4-addr',
      value: '203.0.113.77',
      riskLevel: 'high',
      threatScore: 78,
      source: 'honeypot',
      title: 'Automated exploit probe against exposed TLS listener',
    },
    {
      type: 'domain-name',
      value: 'c2-beacon.example',
      riskLevel: 'high',
      threatScore: 81,
      source: 'asm',
      title: 'Suspicious external callback domain detected during ASM verification',
    },
  ],
};

export const DEMO_SOAR_ALERTS: SoarAlert[] = [
  {
    id: 'demo-soar-1',
    severity: 'critical',
    score: 92,
    indicator: '198.51.100.42',
    indicatorType: 'ipv4-addr',
    title: 'Repeated credential stuffing burst on edge-sensor-01',
    source: 'honeypot',
  },
  {
    id: 'demo-soar-2',
    severity: 'high',
    score: 81,
    indicator: 'c2-beacon.example',
    indicatorType: 'domain-name',
    title: 'Sample SOAR escalation for unauthorized egress indicator',
    source: 'asm',
  },
];
