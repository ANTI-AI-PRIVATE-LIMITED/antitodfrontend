import { describe, expect, it, spyOn } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import api from '../../api/client';
import { API_ENDPOINTS } from '../../config/config';
import {
  GEMINI_DEFAULT_MODEL,
  GeminiProxyError,
  classifyGeminiProxyError,
  extractGroundingSources,
  getAiCapabilities,
} from '../../services/geminiService';
import { searchThreatIntelligence } from '../../services/aiConverter';

const ROOT = path.resolve(import.meta.dir, '../..');

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('QA-024: AI Provider Readiness, Grounding Citations & Honest Failure Handling', () => {
  it('aligns default Gemini model to gemini-2.5-flash and exposes capabilities endpoint', () => {
    expect(GEMINI_DEFAULT_MODEL).toBe('gemini-2.5-flash');
    expect(API_ENDPOINTS.PROXY_CAPABILITIES).toBe('/AdminRoutes/proxy/capabilities');
    expect(readRel('.env.example')).toContain('VITE_AI_ENABLED');
  });

  it('extracts and sanitizes valid HTTP(S) grounding chunks while rejecting unsafe URIs', () => {
    const sources = extractGroundingSources({
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [
              { web: { title: 'CISA Advisory', uri: 'https://www.cisa.gov/advisory' } },
              { web: { title: 'Duplicate', uri: 'https://www.cisa.gov/advisory' } },
              { web: { title: 'Bad Scheme', uri: 'javascript:alert(1)' } },
              { web: { uri: 'https://nvd.nist.gov/vuln/detail/CVE-2025-1234' } },
            ],
          },
        },
      ],
    });

    expect(sources).toEqual([
      { title: 'CISA Advisory', uri: 'https://www.cisa.gov/advisory' },
      { title: 'nvd.nist.gov', uri: 'https://nvd.nist.gov/vuln/detail/CVE-2025-1234' },
    ]);
  });

  it('classifies 503 PROVIDER_NOT_CONFIGURED, 429 RATE_LIMITED, and ERR_DEMO_READ_ONLY distinctly', () => {
    const missingKey = classifyGeminiProxyError({
      response: { status: 503, data: { code: 'PROVIDER_NOT_CONFIGURED', message: 'AI assistant is not configured' } },
    });
    expect(missingKey).toBeInstanceOf(GeminiProxyError);
    expect(missingKey.code).toBe('PROVIDER_NOT_CONFIGURED');
    expect(missingKey.status).toBe(503);
    expect(missingKey.message).toContain('GEMINI_API_KEY');

    const rateLimited = classifyGeminiProxyError({ response: { status: 429, data: {} } });
    expect(rateLimited.code).toBe('RATE_LIMITED');

    const demoErr = classifyGeminiProxyError({ code: 'ERR_DEMO_READ_ONLY' });
    expect(demoErr.code).toBe('DEMO_READ_ONLY');
  });

  it('propagates PROVIDER_NOT_CONFIGURED errors from searchThreatIntelligence instead of deceptive local stub text', async () => {
    const postSpy = spyOn(api, 'post').mockRejectedValueOnce({
      response: { status: 503, data: { code: 'PROVIDER_NOT_CONFIGURED', message: 'AI assistant is not configured' } },
    });

    try {
      await expect(searchThreatIntelligence('APT29 TTPs')).rejects.toThrow('GEMINI_API_KEY missing');
    } finally {
      postSpy.mockRestore();
    }

    const postSuccessSpy = spyOn(api, 'post').mockResolvedValueOnce({
      data: {
        candidates: [
          {
            content: { parts: [{ text: '## Grounded Briefing\nValid technical findings.' }] },
            groundingMetadata: {
              groundingChunks: [{ web: { title: 'MITRE G0016', uri: 'https://attack.mitre.org/groups/G0016/' } }],
            },
          },
        ],
      },
    } as any);

    try {
      const res = await searchThreatIntelligence('APT29 TTPs');
      expect(res.text).toContain('## Grounded Briefing');
      expect(res.sources).toEqual([
        { title: 'MITRE G0016', uri: 'https://attack.mitre.org/groups/G0016/' },
      ]);
    } finally {
      postSuccessSpy.mockRestore();
    }

    const getSpy = spyOn(api, 'get').mockResolvedValueOnce({
      data: { providers: { gemini: false }, defaultGeminiModel: 'gemini-2.5-flash' },
    } as any);
    try {
      const caps = await getAiCapabilities();
      expect(caps?.providers.gemini).toBe(false);
    } finally {
      getSpy.mockRestore();
    }
  });

  it('removes fake local-completion and hardcoded 92% verified confidence stubs from aiConverter and IntelSearchView', () => {
    const converter = readRel('services/aiConverter.ts');
    const view = readRel('components/views/IntelSearchView.tsx');

    expect(converter).not.toContain('completed locally');
    expect(view).not.toContain("width: '92%'");
    expect(view).toContain('GEMINI_API_KEY missing');
    expect(view).toContain('getAiCapabilities');
  });
});
