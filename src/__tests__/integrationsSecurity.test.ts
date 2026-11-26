import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const VIEWS_DIR = path.resolve(__dirname, '../../components/views');
const SRC_DIR = path.resolve(__dirname, '../');

describe('QA-018 & BUG-020: Zero-Retention Secrets & No Native Browser alert()/confirm()', () => {
  test('IntegrationsView wipes auth tokens, passwords, and HMAC secrets via resetConnectorFormState / closeModal across dismiss paths and unmount', () => {
    const src = fs.readFileSync(path.join(VIEWS_DIR, 'IntegrationsView.tsx'), 'utf8');

    expect(src).toContain('resetConnectorFormState');
    expect(src).toContain('closeModal');
    expect(src).toContain("setFormAuthToken('')");
    expect(src).toContain("setFormPassword('')");
    expect(src).toContain("setFormSecret('')");
    expect(src).toContain('autoComplete="new-password"');
    expect(src).not.toContain('() => setIsModalOpen(false)');
  });

  test('IntegrationsView and XyberahReconView use themed in-app dialogs/notifications with zero native alert() or window.confirm()', () => {
    const views = fs.readdirSync(VIEWS_DIR).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
    const pagesDir = path.join(SRC_DIR, 'pages');
    const pages = fs.existsSync(pagesDir)
      ? fs.readdirSync(pagesDir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
      : [];

    for (const file of views) {
      const content = fs.readFileSync(path.join(VIEWS_DIR, file), 'utf8');
      expect(content).not.toMatch(/\bwindow\.alert\s*\(/);
      expect(content).not.toMatch(/(?<![\w.])alert\s*\(/);
      expect(content).not.toMatch(/\bwindow\.confirm\s*\(/);
    }
    for (const file of pages) {
      const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
      expect(content).not.toMatch(/\bwindow\.alert\s*\(/);
      expect(content).not.toMatch(/(?<![\w.])alert\s*\(/);
      expect(content).not.toMatch(/\bwindow\.confirm\s*\(/);
    }

    const integrationsSrc = fs.readFileSync(path.join(VIEWS_DIR, 'IntegrationsView.tsx'), 'utf8');
    expect(integrationsSrc).toContain('pendingDeleteConnector');
    expect(integrationsSrc).toContain('aria-label="Confirm connector deletion"');
    expect(integrationsSrc).toContain('actionNotice');

    const reconSrc = fs.readFileSync(path.join(VIEWS_DIR, 'XyberahReconView.tsx'), 'utf8');
    expect(reconSrc).toContain('confirmDeleteTarget');
  });
});
