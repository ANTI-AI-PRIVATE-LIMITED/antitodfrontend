import React, { useEffect, useState } from 'react';

/** BUG-025: public policy pages (Terms, Privacy, Refund, Cancellation, Contact). Text lives in public/legal/*.md. */
export const LEGAL_PAGES: Record<string, { file: string; title: string }> = {
  '/terms': { file: 'terms', title: 'Terms of Service' },
  '/privacy': { file: 'privacy', title: 'Privacy Policy' },
  '/refund': { file: 'refund', title: 'Refund Policy' },
  '/cancellation': { file: 'cancellation', title: 'Cancellation Policy' },
  '/contact': { file: 'contact', title: 'Contact Us' },
};

// Shown until the text has been reviewed. Set VITE_LEGAL_DRAFT=false to hide it.
const IS_DRAFT = (import.meta as any)?.env?.VITE_LEGAL_DRAFT !== 'false';

/** **bold** only; everything else is plain text, so nothing from the file is rendered as HTML. */
const inline = (s: string): React.ReactNode[] =>
  s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p
  );

function renderMarkdown(md: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim() || l.trim() === '---' || l.startsWith('# ')) continue;
    if (l.startsWith('## ') || l.startsWith('### ')) {
      out.push(<h2 key={i} className="text-lg font-semibold text-white mt-6 mb-2">{inline(l.replace(/^#+\s*/, ''))}</h2>);
    } else if (/^\s*[*-] /.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[*-] /.test(lines[i])) items.push(lines[i++].replace(/^\s*[*-] /, ''));
      i--;
      out.push(<ul key={i} className="list-disc pl-6 space-y-1 my-2">{items.map((t, k) => <li key={k}>{inline(t)}</li>)}</ul>);
    } else if (l.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i++].split('|').slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
      }
      i--;
      out.push(
        <div key={i} className="overflow-x-auto my-3">
          <table className="text-sm border-collapse">
            <tbody>
              {rows.map((r, k) => (
                <tr key={k} className={k === 0 ? 'font-semibold' : ''}>
                  {r.map((c, j) => <td key={j} className="border border-neutral-800 px-3 py-1 align-top">{inline(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else {
      out.push(<p key={i} className="my-2">{inline(l)}</p>);
    }
  }
  return out;
}

export const LegalView: React.FC<{ path: string; onBack: () => void }> = ({ path, onBack }) => {
  const page = LEGAL_PAGES[path];
  const [md, setMd] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    document.title = `${page.title} | ANTITODE`;
    setMd(null);
    setFailed(false);
    fetch(`/legal/${page.file}.md`)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then(setMd)
      .catch(() => setFailed(true));
  }, [page]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-300 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <button type="button" onClick={onBack} className="text-sm text-neutral-400 hover:text-white mb-6">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-white mb-2">{page.title}</h1>
        <p className="text-xs text-neutral-500 mb-4">ANTI AI Private Limited &middot; ANTITODE</p>
        {IS_DRAFT && (
          <p className="text-xs text-amber-400 border border-amber-500/30 rounded px-3 py-2 mb-4">
            Draft: this policy is pending final review and may change.
          </p>
        )}
        {failed ? <p>Could not load this page. Please email support@antiai.ltd.</p> : md === null ? <p>Loading...</p> : renderMarkdown(md)}
        <LegalLinks className="mt-10" />
      </div>
    </main>
  );
};

/** Footer links to all policy pages (used on login, signup and the policy pages). */
export const LegalLinks: React.FC<{ className?: string }> = ({ className = '' }) => (
  <nav aria-label="Policies" className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-neutral-500 ${className}`}>
    {Object.entries(LEGAL_PAGES).map(([href, p]) => (
      <a key={href} href={href} className="hover:text-neutral-300 underline-offset-2 hover:underline">
        {p.title}
      </a>
    ))}
  </nav>
);
