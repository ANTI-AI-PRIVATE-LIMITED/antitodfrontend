import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const readFile = (relFromRoot: string): string =>
  fs.readFileSync(path.resolve(__dirname, '../../', relFromRoot), 'utf8');

describe('BUG-011 & BUG-012: Infrastructure Placeholders & Public Demo Read-Only Preview', () => {
  test('InfrastructureView eliminates fictional Mumbai demo placeholders (deqoy-prod-1 / 13.233.163.244)', () => {
    const viewSrc = readFile('components/views/InfrastructureView.tsx');
    expect(viewSrc).not.toContain('deqoy-prod-1');
    expect(viewSrc).not.toContain("'deqoy'");
    expect(viewSrc).not.toContain('13.233.163.244');
    expect(viewSrc).not.toContain('ap-south-1');

    // Uses neutral RFC 5737 documentation IP and neutral node placeholders
    expect(viewSrc).toContain('203.0.113.10');
    expect(viewSrc).toContain('edge-sensor-01');
    expect(viewSrc).toContain('us-west-2');
  });

  test('InfrastructureView provides read-only demo fixtures and disabled registration controls with explanatory tooltips when isPublicDemo()', () => {
    const viewSrc = readFile('components/views/InfrastructureView.tsx');
    expect(viewSrc).toContain('DEMO_SERVERS_OVERVIEW');
    expect(viewSrc).toContain('DEMO_SHIPPERS');
    expect(viewSrc).toContain('DEMO_TEMPLATES');
    expect(viewSrc).toContain('DEMO SANDBOX');
    expect(viewSrc).toContain('Sign in with a customer account to register');
    expect(viewSrc).toContain('disabled={demoMode}');

    const demoSrc = readFile('src/data/demo/infrastructure.ts');
    expect(demoSrc).not.toContain('13.233.163.244');
    expect(demoSrc).not.toContain('deqoy');
    expect(demoSrc).toContain('203.0.113.');
  });
});
