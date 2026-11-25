import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { analyzeHttpHeaders, performTrace } from '../../services/netTools';

const originalFetch = globalThis.fetch;

describe('BUG-017: Network Tools HTTP Header Inspection & Real Traceroute Telemetry', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
    delete (globalThis as any).sessionStorage;
  });

  test('removes Math.random() and synthetic 10.x.x.x hop fabrication from services/netTools.ts', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../services/netTools.ts'), 'utf8');
    expect(src).not.toContain('Math.random()');
    expect(src).not.toContain('10.${Math.floor');
    expect(src).not.toContain("statusText = 'Inspection Coming Soon");
  });

  test('analyzeHttpHeaders fetches real headers and evaluates security posture via /AdminRoutes/proxy/webcheck', async () => {
    (globalThis as any).window = { location: { search: '' } };
    (globalThis as any).localStorage = { getItem: () => 'test-admin-token' };
    (globalThis as any).sessionStorage = { getItem: () => null };

    let calledUrl = '';
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calledUrl = typeof input === 'string' ? input : input.toString();
      return new Response(
        JSON.stringify({
          targetUrl: 'https://example.org',
          finalUrl: 'https://example.org/',
          status: 200,
          statusText: 'OK',
          headers: {
            server: 'cloudflare',
            'strict-transport-security': 'max-age=31536000',
            'x-content-type-options': 'nosniff',
          },
          redirects: ['https://example.org/'],
          htmlSample: '',
          bodyBytes: 512,
          hasRobotsTxt: true,
          hasSitemap: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const res = await analyzeHttpHeaders('example.org');
    expect(calledUrl).toContain('/AdminRoutes/proxy/webcheck?url=https%3A%2F%2Fexample.org');
    expect(res.error).toBeUndefined();
    expect(res.status).toBe(200);
    expect(res.serverInfo.server).toBe('cloudflare');
    expect(res.security.find((h) => h.name === 'Strict-Transport-Security')?.valid).toBe(true);
    expect(res.security.find((h) => h.name === 'Content-Security-Policy')?.valid).toBe(false);
  });

  test('analyzeHttpHeaders returns explicit error diagnostics rather than silent null on failure or demo mode', async () => {
    (globalThis as any).window = { location: { search: '' } };
    (globalThis as any).localStorage = { getItem: () => 'test-admin-token' };
    (globalThis as any).sessionStorage = { getItem: () => null };

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ code: 'UPSTREAM_ERROR', message: 'Upstream target request failed' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )) as any;

    const failed = await analyzeHttpHeaders('unreachable.example');
    expect(failed.status).toBe(502);
    expect(failed.error).toContain('Upstream target request failed');
    expect(failed.security).toEqual([]);

    (globalThis as any).window = { location: { search: '?demo=true' } };
    const demo = await analyzeHttpHeaders('example.org');
    expect(demo.status).toBe(0);
    expect(demo.error).toContain('Authenticated session required');
  });

  test('performTrace resolves DoH A record and runs real TCP reachability probe via /AdminRoutes/proxy/ping', async () => {
    (globalThis as any).window = { location: { search: '' } };
    (globalThis as any).localStorage = { getItem: () => 'test-admin-token' };
    (globalThis as any).sessionStorage = { getItem: () => null };

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('dns.google') || url.includes('dns-query')) {
        return new Response(JSON.stringify({ Answer: [{ data: '93.184.216.34' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/AdminRoutes/proxy/ping')) {
        return new Response(
          JSON.stringify({
            target: '93.184.216.34',
            resolvedIp: '93.184.216.34',
            port: 443,
            reachable: true,
            rttMs: 22,
            status: 'OK',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 404 });
    }) as any;

    const hops = await performTrace('example.com');
    expect(hops.length).toBe(1);
    expect(hops[0]).toEqual({
      hop: 1,
      ip: '93.184.216.34',
      time: 22,
      status: 'OK',
      details: 'Direct TCP reachability verified (port 443)',
    });
  });
});
