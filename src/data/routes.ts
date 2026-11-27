import { ALL_NAV_ITEMS, canonicalViewId } from './navigation';

export interface AppRoute {
  viewId: string;
  path: string;
}

const ROUTE_SLUGS: Record<string, string> = {
  dashboard: 'dashboard',
  honeypot_logs: 'honeypot-logs',
  soc_wall: 'soc-wall',
  attackmap: 'threat-map',
  ransomware: 'ransomware-monitor',
  analysis: 'log-analysis',
  network: 'network-forensics',
  email_forensic: 'email-forensic',
  dynamic_sandbox: 'dynamic-sandbox',
  threat_canvas: 'threat-canvas',
  navigator: 'mitre-navigator',
  intel_search: 'intel-grounding',
  actors: 'threat-actors',
  cve: 'vulnerabilities',
  exploits: 'exploit-db',
  news: 'intel-feed',
  iocs: 'ioc-manager',
  brand_intel: 'brand-intel',
  cyberchef: 'cyberchef',
  nettools: 'network-tools',
  webcheck: 'web-check',
  infrastructure: 'infrastructure',
  recon: 'recon',
  integrations: 'integrations',
  chat: 'ai-assistant',
  help: 'system-guide',
  access_control: 'access-control',
  billing: 'billing',
  settings: 'settings',
};

const DEPRECATED_VIEW_PREFIX = 'deprecated:';

/**
 * Legacy paths for unbacked modules removed under QA-019. Direct visits are
 * recognized cleanly so ViewRouter can render a guided recovery view rather
 * than advertising them as active routes or returning empty stubs.
 */
export const DEPRECATED_SLUGS = new Set([
  'investigations',
  'graph-investigation',
  'investigation-bench',
  'rules',
  'soc-rules',
  'playbooks',
  'response-playbooks',
  'network-topology',
]);

const PATH_TO_VIEW = Object.fromEntries(
  Object.entries(ROUTE_SLUGS).map(([viewId, slug]) => [`/${slug}`, viewId]),
) as Record<string, string>;

export function isDeprecatedViewId(id: string): boolean {
  return id.startsWith(DEPRECATED_VIEW_PREFIX);
}

export function routeForView(id: string) {
  if (isDeprecatedViewId(id)) {
    return `/${id.slice(DEPRECATED_VIEW_PREFIX.length)}`;
  }
  const viewId = canonicalViewId(id);
  return `/${ROUTE_SLUGS[viewId] ?? viewId}`;
}

export function viewForPath(pathname: string) {
  const clean = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  if (clean === '/') return 'dashboard';
  if (PATH_TO_VIEW[clean]) return PATH_TO_VIEW[clean];
  const bareSlug = clean.slice(1);
  if (DEPRECATED_SLUGS.has(bareSlug)) {
    return `${DEPRECATED_VIEW_PREFIX}${bareSlug}`;
  }
  return 'dashboard';
}

export function isKnownRoute(pathname: string) {
  const clean = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  return clean === '/' || clean === '/login' || Boolean(PATH_TO_VIEW[clean]);
}

export function allAppRoutes(): AppRoute[] {
  return ALL_NAV_ITEMS
    .filter((item) => item.id !== 'settings')
    .map((item) => ({ viewId: item.id, path: routeForView(item.id) }));
}
