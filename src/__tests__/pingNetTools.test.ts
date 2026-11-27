import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { performPing } from '../../services/netTools';

const originalFetch = globalThis.fetch;

describe('QA-014: Network Tools Ping Utility', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
    delete (globalThis as any).sessionStorage;
  });

  test('routes ping requests via /AdminRoutes/proxy/ping rather than allowlisted /AdminRoutes/proxy/fetch HEAD', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../services/netTools.ts'), 'utf8');
    const pingSection = src.slice(src.indexOf('export const performPing'), src.indexOf('export interface TraceHop'));
    expect(pingSection).toContain('pingTargetViaProxy');
    expect(pingSection).not.toContain('toProxyUrl(');
    expect(pingSection).not.toContain("method: 'HEAD'");
  });

  test('returns OK with server-measured RTT and resolved IP for reachable public target', async () => {
    (globalThis as any).window = { location: { search: '' } };
    (globalThis as any).localStorage = { getItem: () => 'test-admin-token' };
    (globalThis as any).sessionStorage = { getItem: () => null };

    let requestedUrl = '';
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requestedUrl = typeof input === 'string' ? input : input.toString();
      return new Response(
        JSON.stringify({
          target: '1.1.1.1',
          resolvedIp: '1.1.1.1',
          port: 443,
          reachable: true,
          rttMs: 18,
          status: 'OK',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const result = await performPing('1.1.1.1', 1);
    expect(requestedUrl).toContain('/AdminRoutes/proxy/ping?target=1.1.1.1');
    expect(result).toEqual({
      seq: 1,
      time: 18,
      status: 'OK',
      ip: '1.1.1.1',
      port: 443,
      message: undefined,
    });
  });

  test('maps 403 HOST_NOT_ALLOWED SSRF blocks to fatal ERROR without faking OK', async () => {
    (globalThis as any).window = { location: { search: '' } };
    (globalThis as any).localStorage = { getItem: () => 'test-admin-token' };
    (globalThis as any).sessionStorage = { getItem: () => null };

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ code: 'HOST_NOT_ALLOWED', message: 'Target resolves to a private or internal address' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )) as any;

    const result = await performPing('127.0.0.1', 1);
    expect(result.status).toBe('ERROR');
    expect(result.time).toBe(0);
    expect(result.fatal).toBe(true);
    expect(result.message).toContain('private or internal');
  });

  test('propagates non-fatal TIMEOUT probe state for slow targets', async () => {
    (globalThis as any).window = { location: { search: '' } };
    (globalThis as any).localStorage = { getItem: () => 'test-admin-token' };
    (globalThis as any).sessionStorage = { getItem: () => null };

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          target: '8.8.4.4',
          resolvedIp: '8.8.4.4',
          port: 443,
          reachable: false,
          rttMs: 2500,
          status: 'TIMEOUT',
          message: 'Connection timed out after 2500ms',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as any;

    const result = await performPing('8.8.4.4', 2);
    expect(result.status).toBe('TIMEOUT');
    expect(result.time).toBe(2500);
    expect(result.fatal).toBeUndefined();
    expect(result.message).toContain('timed out');
  });

  test('skips authenticated ping request and fails fatally in public demo mode', async () => {
    (globalThis as any).window = { location: { search: '?demo=true' } };
    (globalThis as any).localStorage = { getItem: () => null };
    (globalThis as any).sessionStorage = { getItem: () => null };

    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response('{}', { status: 200 });
    }) as any;

    const result = await performPing('8.8.8.8', 1);
    expect(called).toBe(false);
    expect(result.status).toBe('ERROR');
    expect(result.fatal).toBe(true);
    expect(result.message).toContain('Authenticated session required');
  });
});
