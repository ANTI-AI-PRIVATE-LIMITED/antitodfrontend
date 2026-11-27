import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { performPortScan, runPortScanReport } from '../../services/netTools';

const originalFetch = globalThis.fetch;

describe('QA-015: Network Tools Active TCP Port Scan & Shodan Correlation', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
    delete (globalThis as any).sessionStorage;
  });

  test('routes active port probes via /AdminRoutes/proxy/portscan and renders PORT SCAN UI panel', () => {
    const netToolsSrc = fs.readFileSync(path.resolve(__dirname, '../../services/netTools.ts'), 'utf8');
    expect(netToolsSrc).toContain('scanPortsViaProxy');
    expect(netToolsSrc).toContain('runPortScanReport');

    const viewSrc = fs.readFileSync(path.resolve(__dirname, '../../components/views/NetworkToolsView.tsx'), 'utf8');
    expect(viewSrc).toContain("activeCategory === 'SCAN'");
    expect(viewSrc).toContain('data-testid="port-scan-panel"');
    expect(viewSrc).toContain('Active TCP Probed');
    expect(viewSrc).toContain('Shodan InternetDB');
  });

  test('correlates active TCP open ports with passive Shodan InternetDB records without dropping unindexed open hosts', async () => {
    (globalThis as any).window = { location: { search: '' } };
    (globalThis as any).localStorage = { getItem: () => 'test-admin-token' };
    (globalThis as any).sessionStorage = { getItem: () => null };

    const fetchedUrls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      fetchedUrls.push(url);
      if (url.includes('/AdminRoutes/proxy/portscan')) {
        return new Response(
          JSON.stringify({
            target: '198.51.100.44',
            resolvedIp: '198.51.100.44',
            scannedCount: 18,
            scannedPorts: [21, 22, 80, 443],
            openPorts: [
              { port: 22, service: 'ssh', transport: 'TCP', state: 'OPEN', rttMs: 21 },
              { port: 443, service: 'https', transport: 'TCP', state: 'OPEN', rttMs: 14 },
            ],
            probedAt: '2026-11-27T12:00:00Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('internetdb.shodan.io')) {
        return new Response(
          JSON.stringify({
            ip: '198.51.100.44',
            ports: [443, 8443],
            tags: ['cloud'],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 404 });
    }) as any;

    const report = await runPortScanReport('198.51.100.44');
    expect(fetchedUrls.some((u) => u.includes('/AdminRoutes/proxy/portscan?target=198.51.100.44'))).toBe(true);
    expect(report.activeAvailable).toBe(true);
    expect(report.passiveAvailable).toBe(true);
    expect(report.scannedCount).toBe(18);
    expect(report.ports).toEqual([
      {
        port: 22,
        service: 'ssh',
        transport: 'TCP',
        tags: [],
        source: 'active-tcp',
        state: 'OPEN',
        rttMs: 21,
      },
      {
        port: 443,
        service: 'https',
        transport: 'TCP',
        tags: ['cloud'],
        source: 'active+shodan',
        state: 'OPEN',
        rttMs: 14,
      },
      {
        port: 8443,
        service: 'https-alt',
        transport: 'TCP',
        tags: ['cloud'],
        source: 'shodan-passive',
        state: 'PASSIVE_RECORD',
      },
    ]);

    const simple = await performPortScan('198.51.100.44');
    expect(simple.length).toBe(3);
  });

  test('propagates 403 HOST_NOT_ALLOWED SSRF blocks honestly and disables scanning in public demo mode', async () => {
    (globalThis as any).window = { location: { search: '' } };
    (globalThis as any).localStorage = { getItem: () => 'test-admin-token' };
    (globalThis as any).sessionStorage = { getItem: () => null };

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ message: 'Target resolves to a private or internal address', code: 'HOST_NOT_ALLOWED' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )) as any;

    const blocked = await runPortScanReport('10.0.0.1');
    expect(blocked.activeAvailable).toBe(false);
    expect(blocked.ports).toEqual([]);
    expect(blocked.error).toContain('private or internal');

    (globalThis as any).window = { location: { search: '?demo=true' } };
    const demoReport = await runPortScanReport('1.1.1.1');
    expect(demoReport.ports).toEqual([]);
    expect(demoReport.error).toContain('Authenticated session required');
  });
});
