import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const readSrc = (relPath: string): string =>
  fs.readFileSync(path.resolve(__dirname, '../', relPath), 'utf8');

describe('BUG-009: Table Cell Sub-Label & Badge Separation (Honeypot Logs & Vulnerabilities)', () => {
  test('HoneypotLogsPage wraps IP source button and Source port subvalue in .at-hp-source-cell', () => {
    const hpSrc = readSrc('pages/HoneypotLogsPage.tsx');
    expect(hpSrc).toContain('<div className="at-hp-source-cell">');
    expect(hpSrc).toContain('<span className="at-hp-subvalue">');
  });

  test('CvePage wraps CVE ID button and EXPLOITED IN THE WILD pill in .at-cve-id-stack', () => {
    const cveSrc = readSrc('pages/CvePage.tsx');
    expect(cveSrc).toContain('<div className="at-cve-id-stack">');
    expect(cveSrc).toContain('<span className="at-cve-id-meta">');
  });

  test('index.css enforces flex-column stacking and block display so sub-labels never concatenate inline', () => {
    const cssSrc = readSrc('index.css');
    expect(cssSrc).toContain('.at-hp-source-cell');
    expect(cssSrc).toMatch(/\.at-hp-subvalue\s*\{[^}]*display:\s*block;/);
    expect(cssSrc).toMatch(/\.at-cve-id-stack\s*\{[^}]*flex-direction:\s*column;/);
    expect(cssSrc).toMatch(/\.at-cve-id-meta\s*\{[^}]*display:\s*inline-flex;/);
  });
});
