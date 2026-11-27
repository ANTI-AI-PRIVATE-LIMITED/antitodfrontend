import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '../..');

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('BUG-002 dynamic theme accent tokens', () => {
  it('configures Tailwind accent alpha-value scale and at CSS var tokens', () => {
    const config = readRel('tailwind.config.js');
    expect(config).toContain('rgb(var(--theme-accent-rgb, 239 68 68) / <alpha-value>)');
    expect(config).toContain('accent');
  });

  it('defines --theme-accent and --theme-accent-rgb for all 8 themes in App.tsx and index.css', () => {
    const app = readRel('src/App.tsx');
    const css = readRel('src/index.css');
    const themes = ['CYBER', 'NORDIC', 'EMBER', 'SENTINEL', 'FORTRESS', 'DARK', 'LIGHT', 'TERMINAL'];

    expect(app).toMatch(/setProperty\(\s*'--theme-accent-rgb'/);
    expect(app).toMatch(/setProperty\(\s*'--theme-accent'/);

    for (const theme of themes) {
      expect(app).toContain(theme);
      const cls = `body.theme-${theme.toLowerCase()}`;
      expect(css).toContain(cls);
    }

    expect(css).toContain('--at-accent: var(--theme-accent, #d62828);');
    expect(css).toContain('--soc-accent: var(--theme-accent, #d62828);');
    expect(css).toContain('--theme-accent-rgb');
  });

  it('uses dynamic CSS custom properties in shell chrome while keeping semantic critical colors red', () => {
    const css = readRel('src/index.css');

    expect(css).toMatch(/\.at-boot-bar span\s*\{[^}]*var\(--theme-accent/);
    expect(css).toMatch(/\.at-loading-spinner\s*\{[^}]*var\(--theme-accent/);
    expect(css).toMatch(/\.at-investigation-identity span i\s*\{[^}]*var\(--theme-accent/);
    expect(css).toMatch(/\.at-investigation-tabs button\.active::after\s*\{[^}]*var\(--theme-accent/);
    expect(css).toMatch(/\.at-investigation-node\.selected \.at-investigation-node-core\s*\{[^}]*var\(--at-accent\)/);
    expect(css).toMatch(/\.at-news-table tbody tr\.active\s*\{[^}]*var\(--theme-accent-rgb/);
    expect(css).toMatch(/\.at-intel-search:focus-within\s*\{[^}]*var\(--theme-accent-rgb/);
    expect(css).toMatch(/\.cyberchef-operation:hover \.cyberchef-operation-add\s*\{[^}]*var\(--theme-accent/);

    expect(css).toMatch(/\.at-chart-legend i\.critical\s*\{[^}]*#d62828/);
    expect(css).toMatch(/\.at-attack-map-node\.critical\s*\{[^}]*#d62828/);
  });

  it('migrates primary interactive chrome to dynamic accent tokens and preserves semantic severity red', () => {
    const migratedChrome: Array<[string, string[]]> = [
      ['src/components/layout/Header.tsx', ['bg-accent', 'text-accent', 'hover:ring-accent/50']],
      ['src/components/common/EmptyState.tsx', ['bg-accent', 'text-accent', 'border-accent/30']],
      ['src/components/modals/PlanNoticeModal.tsx', ['bg-accent hover:bg-accent-hover', 'border-accent']],
      ['components/views/IntelSearchView.tsx', ['bg-accent', 'text-accent']],
      ['components/views/InfrastructureView.tsx', ['bg-accent/10', 'text-accent', 'focus:border-accent']],
      ['components/views/NetworkToolsView.tsx', ['text-accent', 'border-accent/30']],
      ['components/views/WebCheckView.tsx', ['text-accent', 'focus:ring-accent', 'bg-accent/20']],
      ['components/views/BigScreenView.tsx', ['bg-accent', 'text-accent', 'group-hover:text-accent']],
      ['components/views/ExploitView.tsx', ['selection:bg-accent/30', 'text-accent']],
      ['components/views/RansomwareView.tsx', ['hover:text-accent']],
      ['components/views/HelpView.tsx', ['text-accent']],
      ['components/views/SettingsView.tsx', ['border-accent', 'text-accent']],
      ['components/views/BillingView.tsx', ['text-accent']],
      ['components/views/LoginView.tsx', ['text-accent', 'focus:border-accent', 'bg-accent']],
      ['components/views/SignupView.tsx', ['text-accent']],
      ['components/views/ResetPasswordView.tsx', ['text-accent']],
      ['components/views/VerifyEmailView.tsx', ['text-accent']],
      ['components/views/XyberahReconView.tsx', ['text-accent']],
      ['components/widgets/LiveThreatFeed.tsx', ['hover:bg-accent']],
      ['src/pages/CvePage.tsx', ['accent-accent']],
      ['src/pages/IocPage.tsx', ['text-accent']],
    ];

    for (const [file, tokens] of migratedChrome) {
      const content = readRel(file);
      for (const token of tokens) {
        expect(content).toContain(token);
      }
    }

    // Semantic danger/critical/offline indicators remain red
    expect(readRel('components/views/ExploitView.tsx')).toContain('CISA KEV');
    expect(readRel('components/views/ExploitView.tsx')).toContain('bg-red-600');
    expect(readRel('components/views/WebCheckView.tsx')).toContain("result.blocklist.summary === 'MALICIOUS'");
    expect(readRel('components/views/WebCheckView.tsx')).toContain('bg-red-900/20');
    expect(readRel('components/views/InfrastructureView.tsx')).toContain("offline: { label: 'OFFLINE', cls: 'text-red-400");
    expect(readRel('components/views/RansomwareView.tsx')).toContain("loc.available ? 'bg-neutral-500' : 'bg-red-500'");
  });
});
