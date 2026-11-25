import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { analyzeHtml, performWebCheck } from '../../services/webcheck';

const originalFetch = globalThis.fetch;

function ensureDomParserShim() {
  if (typeof (globalThis as any).DOMParser !== 'undefined') return;
  // Minimal DOMParser polyfill for Bun unit test environment (headless Node/Bun without browser DOM)
  (globalThis as any).DOMParser = class MockDOMParser {
    parseFromString(html: string) {
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const metas: Array<{ getAttribute: (name: string) => string | null }> = [];
      const metaRegex = /<meta\b([^>]*)>/gi;
      let m: RegExpExecArray | null;
      while ((m = metaRegex.exec(html)) !== null) {
        const attrs = m[1];
        const attrMap: Record<string, string> = {};
        const attrRegex = /([a-zA-Z0-9_-]+)\s*=\s*["']([^"']*)["']/g;
        let am: RegExpExecArray | null;
        while ((am = attrRegex.exec(attrs)) !== null) {
          attrMap[am[1].toLowerCase()] = am[2];
        }
        metas.push({ getAttribute: (k: string) => attrMap[k.toLowerCase()] ?? null });
      }
      const linkMatch = html.match(/<link\b[^>]*rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i);
      return {
        title: titleMatch ? titleMatch[1] : '',
        querySelectorAll: (sel: string) => (sel === 'meta' ? metas : []),
        querySelector: (sel: string) =>
          sel.includes('icon') && linkMatch ? { getAttribute: (k: string) => (k === 'href' ? linkMatch[1] : null) } : null,
      };
    }
  };
}

describe('QA-022 & QA-023: WebCheck HTTP Header and HTML Inspection', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
    delete (globalThis as any).sessionStorage;
  });

  test('does not contain hardcoded Inspection Coming Soon v1.1 stub in services/webcheck.ts', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../services/webcheck.ts'), 'utf8');
    expect(src).not.toContain('Inspection Coming Soon');
    expect(src).toContain('inspectWebTargetViaProxy');
    expect(src).toContain('analyzeHtml(');
  });

  test('populates real security headers, HTML metadata, tech stack, robots/sitemap, and carbon footprint via backend inspection', async () => {
    ensureDomParserShim();
    (globalThis as any).window = { location: { search: '' } };
    (globalThis as any).localStorage = { getItem: () => 'test-admin-token' };
    (globalThis as any).sessionStorage = { getItem: () => null };

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/AdminRoutes/proxy/webcheck')) {
        return new Response(
          JSON.stringify({
            targetUrl: 'https://example.org',
            finalUrl: 'https://example.org/',
            status: 200,
            statusText: 'OK',
            headers: {
              'strict-transport-security': 'max-age=63072000',
              'x-content-type-options': 'nosniff',
              server: 'cloudflare',
            },
            redirects: ['https://example.org/'],
            htmlSample:
              '<html><head><title>Example Security Target</title><meta name="description" content="Sample"><link rel="icon" href="/favicon.ico"></head><body><script src="/_next/static/chunk.js"></script></body></html>',
            bodyBytes: 12000,
            hasRobotsTxt: true,
            hasSitemap: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as any;

    const result = await performWebCheck('example.org');

    expect(result.http.status).toBe(200);
    expect(result.http.redirects).toEqual(['https://example.org/']);
    expect(result.page.hasRobotsTxt).toBe(true);
    expect(result.page.hasSitemap).toBe(false);
    expect(result.page.title).toBe('Example Security Target');
    expect(result.page.metaTags.description).toBe('Sample');
    expect(result.page.techStack).toContain('Next.js');
    expect(result.page.techStack).toContain('Cloudflare');
    expect(result.visuals?.favicon).toBe('https://example.org/favicon.ico');
    expect(result.carbon?.g).toBeGreaterThan(0);

    const hsts = result.http.securityHeaders.find((h) => h.name === 'Strict-Transport-Security');
    const csp = result.http.securityHeaders.find((h) => h.name === 'Content-Security-Policy');
    expect(hsts?.valid).toBe(true);
    expect(csp?.valid).toBe(false);
  });

  test('avoids false-positive Missing securityHeaders when inspection fails with 403 HOST_NOT_ALLOWED', async () => {
    ensureDomParserShim();
    (globalThis as any).window = { location: { search: '' } };
    (globalThis as any).localStorage = { getItem: () => 'test-admin-token' };
    (globalThis as any).sessionStorage = { getItem: () => null };

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/AdminRoutes/proxy/webcheck')) {
        return new Response(
          JSON.stringify({ code: 'HOST_NOT_ALLOWED', message: 'Target URL resolves to a private or internal address' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as any;

    const result = await performWebCheck('http://169.254.169.254');

    expect(result.http.status).toBe(403);
    expect(result.http.statusText).toContain('private or internal');
    expect(result.http.securityHeaders).toEqual([]);
  });

  test('analyzeHtml extracts meta tags, title, and tech stack directly', () => {
    ensureDomParserShim();
    const partial: any = {
      http: { status: 200, statusText: 'OK', headers: { server: 'nginx' }, redirects: [], securityHeaders: [] },
      page: { metaTags: {}, techStack: [], hasRobotsTxt: false, hasSitemap: false },
      visuals: { screenshot: '', favicon: '' },
    };
    analyzeHtml('<html><head><title>App</title><meta name="generator" content="WordPress 6"></head><body class="wp-content"></body></html>', partial, 'https://target.test');
    expect(partial.page.title).toBe('App');
    expect(partial.page.metaTags.generator).toBe('WordPress 6');
    expect(partial.page.techStack).toContain('WordPress');
    expect(partial.page.techStack).toContain('Nginx');
  });
});
