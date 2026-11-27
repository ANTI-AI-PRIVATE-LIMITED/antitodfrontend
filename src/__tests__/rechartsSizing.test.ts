import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const readFile = (relFromRoot: string): string =>
  fs.readFileSync(path.resolve(__dirname, '../../', relFromRoot), 'utf8');

describe('BUG-018: Recharts ResponsiveContainer Positive Initial Bounds & Grid Track Containment', () => {
  test('all ResponsiveContainer instances declare positive initialDimension and minWidth/minHeight', () => {
    const targets = [
      'src/pages/DashboardPage.tsx',
      'components/views/XyberahReconView.tsx',
    ];

    for (const file of targets) {
      const src = readFile(file);
      const openingTags = src.match(/<ResponsiveContainer[\s\S]*?>/g) ?? [];
      expect(openingTags.length).toBeGreaterThan(0);

      for (const tag of openingTags) {
        expect(tag).toMatch(/initialDimension=\{\{\s*width:\s*[1-9]\d*,\s*height:\s*[1-9]\d*\s*\}\}/);
        expect(tag).toMatch(/minWidth=\{[1-9]\d*\}/);
        expect(tag).toMatch(/minHeight=\{[1-9]\d*\}/);
      }
    }
  });

  test('dashboard chart wrappers and grid panels enforce min-width: 0 and explicit positive widths', () => {
    const cssSrc = readFile('src/index.css');
    expect(cssSrc).toMatch(/\.at-chart-wrap\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;/);
    expect(cssSrc).toMatch(/\.at-chart-wrap-large\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;/);
    expect(cssSrc).toMatch(/\.at-chart-panel,\s*\.at-feed-panel\s*\{[^}]*min-width:\s*0;/);
  });
});
