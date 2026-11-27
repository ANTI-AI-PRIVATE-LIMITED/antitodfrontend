import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  COUNTRY_COORDS,
  normalizeCountryCode,
  projectLonLatToPercent,
  resolveCountryPlotPosition,
} from '../utils/geoCountries';

describe('QA-026: Global Country Plotting & Projection (2D + 3D Threat Map)', () => {
  test('AttackMapPage no longer drops nations with the 14-country static COUNTRY_LAYOUT filter', () => {
    const pageSrc = fs.readFileSync(path.resolve(__dirname, '../pages/AttackMapPage.tsx'), 'utf8');
    expect(pageSrc).toContain('resolveCountryPlotPosition');
    expect(pageSrc).not.toContain('const COUNTRY_LAYOUT:');
  });

  test('resolves coordinates and valid 2D overlay percentages for previously dropped countries worldwide', () => {
    const previouslyDropped = ['GB', 'CA', 'AU', 'SG', 'IT', 'ES', 'SE', 'CH', 'AE', 'ZA', 'NG', 'TH', 'AR', 'PL', 'NO'];

    for (const code of previouslyDropped) {
      expect(COUNTRY_COORDS[code]).toBeDefined();
      const pos = resolveCountryPlotPosition(code);
      expect(pos).not.toBeNull();
      expect(pos!.layout.left).toBeGreaterThanOrEqual(4);
      expect(pos!.layout.left).toBeLessThanOrEqual(96);
      expect(pos!.layout.top).toBeGreaterThanOrEqual(6);
      expect(pos!.layout.top).toBeLessThanOrEqual(92);
    }
  });

  test('normalizes UK alias to GB and prefers explicit non-zero telemetry lat/lon coordinates', () => {
    expect(normalizeCountryCode('uk')).toBe('GB');

    const withTelemetry = resolveCountryPlotPosition('SG', 1.3521, 103.8198);
    expect(withTelemetry).not.toBeNull();
    expect(withTelemetry!.coords).toEqual([103.8198, 1.3521]);

    const projected = projectLonLatToPercent(103.8198, 1.3521);
    expect(withTelemetry!.layout).toEqual(projected);
  });

  test('returns null cleanly for empty/unknown country codes without coordinates', () => {
    expect(resolveCountryPlotPosition('')).toBeNull();
    expect(resolveCountryPlotPosition('XX')).toBeNull();
    expect(resolveCountryPlotPosition('XX', 0, 0)).toBeNull();
  });
});
