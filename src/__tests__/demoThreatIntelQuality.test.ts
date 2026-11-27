import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEMO_CVES } from '../data/demo/vulnerabilities';
import { DEMO_CVE_FEEDS } from '../data/demo/cveFeeds';
import { DEMO_EXPLOITS } from '../data/demo/exploits';
import { DEMO_RANSOMWARE_GROUPS, DEMO_RANSOMWARE_POSTS } from '../data/demo/ransomware';

const readDemoFile = (name: string): string =>
  fs.readFileSync(path.resolve(__dirname, '../data/demo', name), 'utf8');

describe('BUG-016: Threat Intelligence Demo Telemetry Uniqueness & Realism', () => {
  test('DEMO_CVES provides unique descriptions, vendors, and products across all records and retains CVE-2024-1068 badge semantics', () => {
    expect(DEMO_CVES.length).toBeGreaterThanOrEqual(30);

    const uniqueDescriptions = new Set(DEMO_CVES.map((c) => c.description.trim()));
    expect(uniqueDescriptions.size).toBe(DEMO_CVES.length);

    for (const cve of DEMO_CVES) {
      expect(cve.description).not.toContain('Vulnerability in component X');
      expect(cve.description).not.toContain('perform action Y');
      expect(cve.vendor).not.toBe('DemoVendor');
      expect(cve.product).not.toBe('DemoProduct');
      expect(cve.cweCategory).not.toBe('Unknown');
    }

    const exploitedDemoCve = DEMO_CVES.find((c) => c.id === 'CVE-2024-1068');
    expect(exploitedDemoCve).toBeDefined();
    expect(exploitedDemoCve?.hasExploit || exploitedDemoCve?.isKev).toBe(true);
  });

  test('DEMO_CVE_FEEDS deduplicates CVE IDs and provides distinct advisory summaries', () => {
    expect(DEMO_CVE_FEEDS.length).toBe(DEMO_CVES.length);

    const uniqueIds = new Set(DEMO_CVE_FEEDS.map((f) => f.cve_id));
    const uniqueDescriptions = new Set(DEMO_CVE_FEEDS.map((f) => f.description.trim()));
    expect(uniqueIds.size).toBe(DEMO_CVE_FEEDS.length);
    expect(uniqueDescriptions.size).toBe(DEMO_CVE_FEEDS.length);

    for (const item of DEMO_CVE_FEEDS) {
      expect(item.description).not.toContain('commonly used service');
    }
  });

  test('DEMO_EXPLOITS provides unique technical PoC descriptions and synthetic .example advisory URLs', () => {
    expect(DEMO_EXPLOITS.length).toBeGreaterThanOrEqual(25);

    const uniqueDescriptions = new Set(DEMO_EXPLOITS.map((e) => e.description.trim()));
    const uniqueLinks = new Set(DEMO_EXPLOITS.map((e) => e.link));
    expect(uniqueDescriptions.size).toBe(DEMO_EXPLOITS.length);
    expect(uniqueLinks.size).toBe(DEMO_EXPLOITS.length);

    for (const ex of DEMO_EXPLOITS) {
      expect(ex.description.length).toBeGreaterThanOrEqual(60);
      expect(ex.description).not.toContain('affecting multiple systems');
      expect(ex.link).toContain('.example/');
    }
  });

  test('DEMO_RANSOMWARE_POSTS and DEMO_RANSOMWARE_GROUPS eliminate dummy xxxxxx.onion strings', () => {
    expect(DEMO_RANSOMWARE_POSTS.length).toBeGreaterThanOrEqual(6);
    expect(DEMO_RANSOMWARE_GROUPS.length).toBeGreaterThanOrEqual(5);

    const uniquePostDescs = new Set(DEMO_RANSOMWARE_POSTS.map((p) => p.description.trim()));
    const uniqueGroupMetas = new Set(DEMO_RANSOMWARE_GROUPS.map((g) => (g.meta || '').trim()));
    expect(uniquePostDescs.size).toBe(DEMO_RANSOMWARE_POSTS.length);
    expect(uniqueGroupMetas.size).toBe(DEMO_RANSOMWARE_GROUPS.length);

    for (const file of ['vulnerabilities.ts', 'cveFeeds.ts', 'exploits.ts', 'ransomware.ts']) {
      const raw = readDemoFile(file);
      expect(raw).not.toContain('xxxxxx.onion');
      expect(raw).not.toContain('Vulnerability in component X');
      expect(raw).not.toContain('commonly used service');
      expect(raw).not.toContain('affecting multiple systems');
    }
  });
});
