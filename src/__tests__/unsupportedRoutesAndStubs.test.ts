import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { dataProvider } from '../services/dataProvider';
import {
  DEPRECATED_SLUGS,
  allAppRoutes,
  isDeprecatedViewId,
  isKnownRoute,
  routeForView,
  viewForPath,
} from '../data/routes';

const ROOT_DIR = path.resolve(__dirname, '../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

describe('QA-019: Remove empty-list production stubs & dead-end investigation/rule/playbook routes', () => {
  test('dataProvider does not expose hardcoded empty-list production stubs', () => {
    const provider = dataProvider as unknown as Record<string, unknown>;
    expect(provider.getInvestigations).toBeUndefined();
    expect(provider.getRules).toBeUndefined();
    expect(provider.getPlaybooks).toBeUndefined();
    expect(typeof dataProvider.getIntelHistory).toBe('function');
    expect(typeof dataProvider.getActors).toBe('function');
  });

  test('AppDataContext and demo barrel remove unused playbook and investigation stubs', () => {
    const appDataCtx = readRepoFile('src/contexts/AppDataContext.tsx');
    expect(appDataCtx).not.toContain('PLAYBOOKS');
    expect(appDataCtx).not.toContain('MOCK_PLAYBOOKS');
    expect(appDataCtx).not.toContain('MOCK_EVENTS');

    const demoIndex = readRepoFile('src/data/demo/index.ts');
    expect(demoIndex).not.toContain("'./investigations'");
    expect(demoIndex).not.toContain("'./rules'");
    expect(demoIndex).not.toContain("'./playbooks'");
  });

  test('routes.ts recognizes deprecated paths without crashing or advertising them as active routes', () => {
    const activeViewIds = new Set(allAppRoutes().map((r) => r.viewId));
    for (const removedId of ['investigation_bench', 'playbooks', 'investigate', 'topology', 'rules']) {
      expect(activeViewIds.has(removedId)).toBe(false);
    }

    for (const slug of DEPRECATED_SLUGS) {
      const legacyPath = `/${slug}`;
      const viewId = viewForPath(legacyPath);
      expect(isDeprecatedViewId(viewId)).toBe(true);
      expect(routeForView(viewId)).toBe(legacyPath);
      expect(isKnownRoute(legacyPath)).toBe(false);
    }

    expect(viewForPath('/dashboard')).toBe('dashboard');
    expect(isKnownRoute('/dashboard')).toBe(true);
    expect(isKnownRoute('/network-tools')).toBe(true);
    expect(isKnownRoute('/unknown-random-route')).toBe(false);
    expect(viewForPath('/unknown-random-route')).toBe('dashboard');
  });

  test('active pages pivot only to live ANTITODE modules instead of unimplemented routes', () => {
    const deadNavigatePattern =
      /onNavigate\(\s*['"](investigate|investigation_bench|topology|rules|playbooks)['"]/;

    for (const file of [
      'src/pages/DashboardPage.tsx',
      'src/pages/AnalysisPage.tsx',
      'src/pages/IocPage.tsx',
    ]) {
      const src = readRepoFile(file);
      expect(src).not.toMatch(deadNavigatePattern);
    }

    const dashboardSrc = readRepoFile('src/pages/DashboardPage.tsx');
    expect(dashboardSrc).toContain("onNavigate('infrastructure')");
    expect(dashboardSrc).toContain("onNavigate('analysis')");
    expect(dashboardSrc).toContain("onNavigate('nettools')");

    const analysisSrc = readRepoFile('src/pages/AnalysisPage.tsx');
    expect(analysisSrc).toContain("onNavigate('iocs')");
    expect(analysisSrc).toContain("onNavigate('nettools')");
    expect(analysisSrc).toContain("onNavigate('honeypot_logs')");

    const iocSrc = readRepoFile('src/pages/IocPage.tsx');
    expect(iocSrc).toContain("'nettools'");
    expect(iocSrc).toContain("'honeypot_logs'");
  });

  test('ViewRouter and Header handle deprecated and unavailable routes with Dashboard recovery', () => {
    const viewRouterSrc = readRepoFile('src/components/ViewRouter.tsx');
    expect(viewRouterSrc).toContain('isDeprecatedViewId(activeView)');
    expect(viewRouterSrc).toContain('actionLabel="Return to Dashboard"');
    expect(viewRouterSrc).toContain("onAction={() => onNavigate('dashboard')}");

    const headerSrc = readRepoFile('src/components/layout/Header.tsx');
    expect(headerSrc).toContain("activeView === 'dashboard' ? 'Dashboard' : 'Module Unavailable'");
  });
});
