import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const readFile = (relFromRoot: string): string =>
  fs.readFileSync(path.resolve(__dirname, '../../', relFromRoot), 'utf8');

describe('QA-025: Responsive Recon Findings Layout & Branding Audit', () => {
  test('XyberahReconView eliminates rigid min-w-[960px] tables and reuses ReconVulnerabilityList', () => {
    const reconSrc = readFile('components/views/XyberahReconView.tsx');
    expect(reconSrc).not.toContain('min-w-[960px]');
    expect(reconSrc).toContain('ReconVulnerabilityList');

    const matches = reconSrc.match(/<ReconVulnerabilityList\b/g) ?? [];
    expect(matches.length).toBe(2);
  });

  test('ReconVulnerabilityList provides responsive mobile/tablet cards below xl and fluid desktop table', () => {
    const listSrc = readFile('components/recon/ReconVulnerabilityList.tsx');
    expect(listSrc).not.toContain('min-w-[960px]');
    expect(listSrc).toContain('xl:hidden');
    expect(listSrc).toContain('hidden xl:block');
    expect(listSrc).toContain('break-all');
    expect(listSrc).toContain('data-testid="recon-vuln-cards"');
    expect(listSrc).toContain('data-testid="recon-vuln-table"');
  });

  test('Recon and Infrastructure views do not leak user-facing legacy Xyberah labels', () => {
    const reconSrc = readFile('components/views/XyberahReconView.tsx');
    const infraSrc = readFile('components/views/InfrastructureView.tsx');

    expect(reconSrc).not.toContain('Xyberah Honeypot');
    expect(reconSrc).not.toContain('Xyberah Recon');
    expect(reconSrc).not.toContain('XyberahDB');
    expect(infraSrc).not.toContain('Xyberah Honeypot');
    expect(infraSrc).toContain('ANTI.AI');
    expect(reconSrc).toContain('ANTI.AI');
  });
});
