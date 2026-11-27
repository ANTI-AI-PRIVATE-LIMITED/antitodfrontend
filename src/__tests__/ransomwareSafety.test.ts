import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { defangUrl, inspectRansomwareTargetUrl } from '../utils/externalLinks';
import { resolveValidFlagIsoCode } from '../utils/geoCountries';

describe('QA-020 & QA-021: Ransomware Link OPSEC Gate & ISO Flag Fallback', () => {
  test('validates ISO-3166 country codes before requesting flagcdn.com icons', () => {
    expect(resolveValidFlagIsoCode('US')).toBe('us');
    expect(resolveValidFlagIsoCode('uk')).toBe('gb');
    expect(resolveValidFlagIsoCode('sg')).toBe('sg');

    for (const invalid of ['Global', 'Multi', 'Worldwide', 'N/A', 'Unknown', '', 'XX', '123']) {
      expect(resolveValidFlagIsoCode(invalid)).toBeNull();
    }
  });

  test('rejects dangerous schemes and defangs HTTP/onion ransomware target URLs', () => {
    expect(inspectRansomwareTargetUrl('javascript:alert(1)').valid).toBe(false);
    expect(inspectRansomwareTargetUrl('data:text/html,<script>').valid).toBe(false);
    expect(inspectRansomwareTargetUrl('').valid).toBe(false);

    const onion = inspectRansomwareTargetUrl('http://lockbit777test.onion/victim');
    expect(onion.valid).toBe(true);
    expect(onion.isOnion).toBe(true);
    expect(onion.defanged).toBe('hxxp://lockbit777test[.]onion/victim');

    const clearnet = inspectRansomwareTargetUrl('victim-example.com');
    expect(clearnet.valid).toBe(true);
    expect(clearnet.isOnion).toBe(false);
    expect(clearnet.href).toBe('http://victim-example.com/');
    expect(defangUrl('https://portal.victim.org/leak')).toBe('hxxps://portal[.]victim[.]org/leak');
  });

  test('RansomwareView gates post.website via inspectRansomwareTargetUrl and resolveValidFlagIsoCode', () => {
    const viewSrc = fs.readFileSync(path.resolve(__dirname, '../../components/views/RansomwareView.tsx'), 'utf8');
    expect(viewSrc).toContain('resolveValidFlagIsoCode(post.country)');
    expect(viewSrc).toContain('inspectRansomwareTargetUrl(post.website)');
    expect(viewSrc).not.toContain('href={post.website');
  });
});
