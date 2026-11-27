import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('QA-028 & BUG-008: ANTITODE System Guide & Brand Consistency', () => {
  const helpViewPath = path.resolve(__dirname, '../../components/views/HelpView.tsx');
  const geminiPath = path.resolve(__dirname, '../../services/geminiService.ts');

  test('HelpView documents real ANTITODE platform capabilities without obsolete client-side PCAP/YARA claims', () => {
    const src = fs.readFileSync(helpViewPath, 'utf8');

    const obsoleteClaims = [
      'ANTI.AI Threat Processor',
      'Xyberah Threat Processor',
      'PCAP',
      'NO UPLOADS',
      'TCP stream reassembly',
      'YARA',
      'CORS proxies',
      'never sent to a remote server',
      'demo@xyberah.com',
    ];

    for (const stale of obsoleteClaims) {
      expect(src).not.toContain(stale);
    }

    expect(src).toContain('ANTITODE');
    expect(src).toContain('Infrastructure & Sensors');
    expect(src).toContain('SIEM Connectors & Governance');
    expect(src).toContain('Open Command Palette');
    expect(src).toContain('TAXII 2.1');
    expect(src).toContain('Web Check');
  });

  test('geminiService uses ANTITODE branding instead of Threat Processor', () => {
    const src = fs.readFileSync(geminiPath, 'utf8');
    expect(src).not.toContain('Threat Processor');
    expect(src).toContain('ANTITODE Security Operations platform');
  });
});
