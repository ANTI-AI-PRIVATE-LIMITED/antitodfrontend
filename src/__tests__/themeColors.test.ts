import { describe, it, expect } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { getAttackRiskColor } from '../../components/views/AttackMapView';

const ROOT = path.resolve(import.meta.dir, '../..');

describe('BUG-003: Cyber Theme Color Consistency (Zero Corporate Blue)', () => {
  it('maps attack severity levels to dark cyber theme colors without corporate blue', () => {
    expect(getAttackRiskColor('CRITICAL')).toBe('#ef4444');
    expect(getAttackRiskColor('HIGH')).toBe('#f97316');
    expect(getAttackRiskColor('MEDIUM')).toBe('#eab308');
    expect(getAttackRiskColor('LOW')).toBe('#4d8760');
    expect(getAttackRiskColor(undefined)).toBe('#4d8760');
  });

  it('contains no hardcoded #3b82f6 or rgb(59,130,246) in Threat Map, SOC Wall, or ApiEventToast', () => {
    const targets = [
      'components/views/AttackMapView.tsx',
      'components/views/BigScreenView.tsx',
      'src/pages/AttackMapPage.tsx',
      'src/components/common/ApiEventToast.tsx',
    ];

    for (const rel of targets) {
      const content = fs.readFileSync(path.join(ROOT, rel), 'utf-8');
      expect(content.toLowerCase()).not.toContain('#3b82f6');
      expect(content.replace(/\s+/g, '')).not.toContain('59,130,246');
    }
  });
});
