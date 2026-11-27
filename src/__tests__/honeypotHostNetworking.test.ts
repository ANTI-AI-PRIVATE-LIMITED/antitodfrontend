import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ensureHostNetworkingCompose,
  inspectComposeNetworking,
} from '../utils/honeypotCompose';
import { DEMO_TEMPLATES } from '../data/demo/infrastructure';

describe('QA-011: Frontend Compose Host Networking Helper & Demo Fixtures', () => {
  test('inspectComposeNetworking identifies bridge port templates that mask attacker IPs as 172.17.0.1', () => {
    const legacy = `version: '3.8'
services:
  cowrie:
    image: cowrie/cowrie:latest
    ports:
      - "2222:2222"`;

    const report = inspectComposeNetworking(legacy);
    expect(report.usesHostNetworking).toBe(false);
    expect(report.requiresNormalization).toBe(true);
    expect(report.servicesMissingHostNetwork).toEqual(['cowrie']);
    expect(report.servicesWithBridgePorts).toEqual(['cowrie']);
  });

  test('ensureHostNetworkingCompose injects network_mode: host and strips conflicting ports', () => {
    const legacy = `services:
  dionaea:
    image: dinotools/dionaea:latest
    ports:
      - "445:445"
    volumes:
      - /var/xyberah/logs/dionaea:/opt/dionaea/var/log/dionaea`;

    const res = ensureHostNetworkingCompose(legacy, { category: 'honeypot' });
    expect(res.modified).toBe(true);
    expect(res.stackFileContent).toContain('network_mode: host');
    expect(res.stackFileContent).not.toContain('ports:');
    expect(res.stackFileContent).not.toContain('445:445');
    expect(res.inspection.usesHostNetworking).toBe(true);
  });

  test('DEMO_TEMPLATES use network_mode: host without bridge ports mapping', () => {
    for (const tpl of DEMO_TEMPLATES.templates) {
      if (tpl.Category !== 'honeypot') continue;
      const report = inspectComposeNetworking(tpl.StackFileContent);
      expect(report.usesHostNetworking).toBe(true);
      expect(report.servicesWithBridgePorts).toEqual([]);
    }
  });

  test('InfrastructureView renders compose host-network validation and auto-enforcement controls', () => {
    const viewSrc = fs.readFileSync(
      path.resolve(__dirname, '../../components/views/InfrastructureView.tsx'),
      'utf8'
    );
    expect(viewSrc).toContain('inspectComposeNetworking');
    expect(viewSrc).toContain('ensureHostNetworkingCompose');
    expect(viewSrc).toContain('network_mode: host');
    expect(viewSrc).toContain('172.17.0.1');
  });
});
