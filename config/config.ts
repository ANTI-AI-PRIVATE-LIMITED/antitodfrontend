/** Set via `.env` — see `.env.example`. No production default (required for API calls). */
export const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL ?? '';

export const API_ENDPOINTS = {
    // Third-party provider proxies (server-side key injection; keys are not bundled in browser)
    PROXY_IPDATA: '/AdminRoutes/proxy/ipdata',
    PROXY_RANSOMWARE_LIVE: '/AdminRoutes/proxy/ransomware-live',
    PROXY_GEMINI: '/AdminRoutes/proxy/gemini',
    PROXY_FETCH: '/AdminRoutes/proxy/fetch',

    // Admin endpoints
    ADMIN_LOGIN: '/AdminRoutes/adminLogin',
    ADMIN_VERIFY_OTP: '/AdminRoutes/adminVerifyOtp',
    VERIFY_ADMIN_TOKEN: '/AdminRoutes/verifyAdminAuthToken',
    ADMIN_ME: '/AdminRoutes/me',
    REGISTER_SERVER: '/AdminRoutes/registerServer',
    REGISTER_SHIPPER: '/AdminRoutes/registerShipper',
    LIST_SERVERS: '/AdminRoutes/listServers',
    LIST_SHIPPERS: '/AdminRoutes/listShippers',
    DEACTIVATE_SHIPPER: '/AdminRoutes/deactivateShipper',
    REACTIVATE_SHIPPER: '/AdminRoutes/reactivateShipper',
    DELETE_SERVER: '/AdminRoutes/servers/:serverId',
    DELETE_SHIPPER: '/AdminRoutes/shippers/:shipperId',
    ADMIN_FORGOT_PASSWORD: '/AdminRoutes/forgotPassword',
    ADMIN_RESET_PASSWORD: '/AdminRoutes/resetPassword',
    ADMIN_VERIFY_EMAIL: '/AdminRoutes/verifyEmail',
    ADMIN_RESEND_VERIFICATION: '/AdminRoutes/resendVerification',
    ADMIN_SIGNUP: '/AdminRoutes/signup',

    // RBAC
    RBAC_PERMISSIONS: '/AdminRoutes/rbac/permissions',
    RBAC_GROUPS: '/AdminRoutes/rbac/groups',
    RBAC_GROUP: '/AdminRoutes/rbac/groups/:groupId',
    RBAC_USERS: '/AdminRoutes/rbac/users',
    RBAC_USER: '/AdminRoutes/rbac/users/:adminId',
    RBAC_AUDIT: '/AdminRoutes/rbac/audit',

    // Billing & Plan
    BILLING_USAGE: '/AdminRoutes/billing/usage',
    BILLING_PLANS: '/AdminRoutes/billing/plans',
    BILLING_HISTORY: '/AdminRoutes/billing/history',

    // V1 HoneyPot endpoints (legacy)
    INGEST_LOGS_V1: '/HoneyPotRoutes/ingestHoneyPotLogs',
    GET_LOGS_V1: '/HoneyPotRoutes/getHoneyPotLogs',
    GET_LATEST_LOGS_V1: '/HoneyPotRoutes/getLatestHoneyPotLogs',
    GET_LOG_STATS_V1: '/HoneyPotRoutes/getHoneyPotLogStats',
    GET_HONEYPOT_TYPES: '/HoneyPotRoutes/getHoneyPotTypes',
    GET_HONEYPOT_SERVERS: '/HoneyPotRoutes/getHoneyPotServers',

    // V2 HoneyPot endpoints (recommended)
    INGEST_LOGS_V2: '/HoneyPotRoutes/v2/ingestHoneyPotLogs',
    GET_LOG_EVENTS_V2: '/HoneyPotRoutes/v2/getLogEvents',
    GET_ENTITY_THREAT_INTEL_V2: '/HoneyPotRoutes/v2/getEntityThreatIntel',
    GET_LOG_STATS_V2: '/HoneyPotRoutes/v2/getLogsEventStats',
    GET_PROXY_LOGS_V2: '/HoneyPotRoutes/v2/getLogs/proxy',

    // V3 HoneyPot endpoints (latest)
    GET_HOSTS_V3: '/HoneyPotRoutes/v3/hosts',
    GET_HOST_DETAILS_V3: '/HoneyPotRoutes/v3/hosts/:ip',
    GET_HOST_EVENTS_V3: '/HoneyPotRoutes/v3/hosts/:ip/events',
    GET_HOST_COMMANDS_V3: '/HoneyPotRoutes/v3/hosts/:ip/commands',
    GET_STATS_V3: '/HoneyPotRoutes/v3/stats',
    GET_HOST_FILTERS_V3: '/HoneyPotRoutes/v3/hosts/filters',
    GET_HOST_TIMELINE_V3: '/HoneyPotRoutes/v3/hosts/:ip/timeline',
    GET_ACTIVITY_TIMELINE_V3: '/HoneyPotRoutes/v3/activity/timeline',
    GET_THREAT_MAP_V3: '/HoneyPotRoutes/v3/threat-map',

    // Exports
    EXPORT_CSV: '/HoneyPotRoutes/export/csv',
    EXPORT_JSON: '/HoneyPotRoutes/export/json',
    EXPORT_STIX: '/HoneyPotRoutes/export/stix',
    EXPORT_PDF: '/HoneyPotRoutes/export/pdf',
    EXPORT_TAXII_PUSH: '/HoneyPotRoutes/export/taxii/push',
    TAXII_DISCOVERY: '/taxii2/',

    // IOC Routes
    IOC_STATS: '/IocRoutes/stats',
    IOC_FEED: '/IocRoutes/feed',
    IOC_FILTERS: '/IocRoutes/filters',
    IOC_SYNC: '/IocRoutes/sync',

    // ── Agent / Infrastructure Routes ──────────────────────────────────────
    // Server overview
    SERVERS_OVERVIEW: '/AdminRoutes/servers/overview',
    SERVER_OVERVIEW: '/AdminRoutes/servers/:serverId/overview',

    // Agent management
    AGENTS_LIST: '/AdminRoutes/agents',
    AGENT_REGISTER: '/AdminRoutes/agents/register',
    AGENT_DETAIL: '/AdminRoutes/agents/:agentId',
    AGENT_DELETE: '/AdminRoutes/agents/:agentId',
    AGENT_HARD_DELETE: '/AdminRoutes/agents/:agentId/hard',
    AGENT_STATUS: '/AdminRoutes/agents/:agentId/status',
    AGENT_INSTALL_SCRIPT: '/AdminRoutes/agents/:agentId/install-script',

    // Container management
    AGENT_CONTAINERS: '/AdminRoutes/agents/:agentId/containers',
    AGENT_CONTAINER_DETAIL: '/AdminRoutes/agents/:agentId/containers/:containerId',
    AGENT_CONTAINER_START: '/AdminRoutes/agents/:agentId/containers/:containerId/start',
    AGENT_CONTAINER_STOP: '/AdminRoutes/agents/:agentId/containers/:containerId/stop',
    AGENT_CONTAINER_RESTART: '/AdminRoutes/agents/:agentId/containers/:containerId/restart',
    AGENT_CONTAINER_REMOVE: '/AdminRoutes/agents/:agentId/containers/:containerId',
    AGENT_CONTAINER_LOGS: '/AdminRoutes/agents/:agentId/containers/:containerId/logs',

    // Deployment templates
    TEMPLATES_LIST: '/AdminRoutes/templates',
    TEMPLATE_CREATE: '/AdminRoutes/templates',
    TEMPLATE_DETAIL: '/AdminRoutes/templates/:templateId',
    TEMPLATE_UPDATE: '/AdminRoutes/templates/:templateId',
    TEMPLATE_DELETE: '/AdminRoutes/templates/:templateId',

    // Stack deployments
    AGENT_DEPLOY: '/AdminRoutes/agents/:agentId/deploy',
    AGENT_DEPLOYMENTS: '/AdminRoutes/agents/:agentId/deployments',
    DEPLOYMENT_START: '/AdminRoutes/deployments/:deploymentId/start',
    DEPLOYMENT_STOP: '/AdminRoutes/deployments/:deploymentId/stop',
    DEPLOYMENT_REMOVE: '/AdminRoutes/deployments/:deploymentId',

    // Metrics & health
    AGENT_METRICS: '/AdminRoutes/agents/:agentId/metrics',
    AGENT_DOCKER_INFO: '/AdminRoutes/agents/:agentId/docker-info',
    PORTAINER_HEALTH: '/AdminRoutes/portainer/health',

    // ── Native ASM Scan Routes (/AsmScanRoutes/*) ──────────────────────────
    ASM_BOOTSTRAP: '/AsmScanRoutes/bootstrap',
    ASM_ACTIVE_WORKSPACE: '/AsmScanRoutes/active-workspace',
    ASM_WORKSPACES: '/AsmScanRoutes/workspaces',
    ASM_TARGETS: '/AsmScanRoutes/targets',
    ASM_TARGETS_BULK: '/AsmScanRoutes/targets/bulk',
    ASM_TARGET_SUBMIT_ASSESS: '/AsmScanRoutes/targets/submit-and-assess',
    ASM_TARGET_RISK: '/AsmScanRoutes/targets/:id/risk',
    ASM_TARGET_RESCAN: '/AsmScanRoutes/targets/:id/re-scan',
    ASM_ASSETS: '/AsmScanRoutes/assets',
    ASM_VULNERABILITIES: '/AsmScanRoutes/vulnerabilities',
    ASM_STATISTICS: '/AsmScanRoutes/statistics',
    ASM_WORKERS: '/AsmScanRoutes/workers',

    // ── SIEM & SOAR Integrations Routes (/IntegrationsRoutes/*) ────────────
    INTEGRATIONS_CONNECTORS: '/IntegrationsRoutes/connectors',
    INTEGRATIONS_CONNECTOR: '/IntegrationsRoutes/connectors/:id',
    INTEGRATIONS_PUSH: '/IntegrationsRoutes/connectors/:id/push',
    INTEGRATIONS_FEED: '/IntegrationsRoutes/feed',
    INTEGRATIONS_SOAR_ALERTS: '/IntegrationsRoutes/soar/alerts',
    INTEGRATIONS_HEALTH: '/IntegrationsRoutes/health',
} as const;

export const AUTH_CONFIG = {
    TOKEN_KEY: 'admin-auth-token',
    TOKEN_EXPIRES_KEY: 'admin-auth-token-expires',
    TOKEN_HEADER: 'authtoken',
} as const;
