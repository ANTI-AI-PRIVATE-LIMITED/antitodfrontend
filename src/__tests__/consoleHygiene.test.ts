import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('BUG-006: Production Console Hygiene & No Object Dumps', () => {
  const root = path.resolve(__dirname, '../..');

  test('contains zero active console.log calls across application source files', () => {
    const dirs = ['src', 'components', 'services', 'contexts', 'api', 'config'];
    const files = dirs.flatMap((d) => collectSourceFiles(path.join(root, d)));
    const hits: string[] = [];

    for (const file of files) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (/\bconsole\.log\s*\(/.test(line)) {
          hits.push(`${path.relative(root, file)}:${idx + 1}`);
        }
      });
    }

    expect(hits).toEqual([]);
  });

  test('api/client.ts does not dump raw response data objects or full Axios errors to console', () => {
    const clientSrc = fs.readFileSync(path.join(root, 'api/client.ts'), 'utf8');
    expect(clientSrc).not.toMatch(/console\.(warn|error|log)\([^)]*,\s*(data|error)\s*\)/);
  });

  test('vite.config.ts strips debugger and marks console.log/debug/info pure in production builds', () => {
    const viteSrc = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
    expect(viteSrc).toContain("drop: ['debugger']");
    expect(viteSrc).toContain("pure: ['console.log', 'console.debug', 'console.info']");
  });
});
