import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const readSrc = (relPath: string): string =>
  fs.readFileSync(path.resolve(__dirname, '../', relPath), 'utf8');

describe('BUG-005: Command Palette Overlay Dismissal & Shortcut Isolation', () => {
  test('Sidebar.tsx does not register duplicate Ctrl/Cmd+K or Ctrl/Cmd+B handlers that fight App.tsx toggles', () => {
    const sidebarSrc = readSrc('components/layout/Sidebar.tsx');
    expect(sidebarSrc).not.toContain("event.key.toLowerCase() === 'k'");
    expect(sidebarSrc).not.toContain("event.key.toLowerCase() === 'b'");
    expect(sidebarSrc).toContain("event.key === '/'");
    expect(sidebarSrc).toContain('.at-command-overlay');
  });

  test('CommandPalette.tsx guards backdrop clicks safely, captures Escape, and exposes an accessible Close button', () => {
    const paletteSrc = readSrc('components/layout/CommandPalette.tsx');
    expect(paletteSrc).toContain('startedInsideModalRef');
    expect(paletteSrc).toContain('onClick={(event) =>');
    expect(paletteSrc).not.toContain('onMouseDown={onClose}');
    expect(paletteSrc).toContain("document.addEventListener('keydown', keyHandler, true)");
    expect(paletteSrc).toContain('event.stopPropagation()');
    expect(paletteSrc).toContain('aria-label="Close global search"');
  });

  test('App.tsx clears CommandPalette open state when activeView or boot state transitions', () => {
    const appSrc = readSrc('App.tsx');
    expect(appSrc).toContain('setSearchOpen(false);');
    expect(appSrc).toContain('[activeView, isStorageLoaded]');
    expect(appSrc).toContain('setSearchOpen(');
  });

  test('index.css raises .at-command-overlay above .at-fullscreen-view and defines .at-command-close', () => {
    const cssSrc = readSrc('index.css');
    const matches = cssSrc.match(/\.at-command-overlay\s*\{[\s\S]*?\}/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    for (const block of matches) {
      expect(block).toContain('z-index: 600;');
      expect(block).not.toContain('z-index: 300;');
    }
    expect(cssSrc).toContain('.at-command-close');
  });
});
