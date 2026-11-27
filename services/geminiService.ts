import api from '../api/client';
import { API_ENDPOINTS } from '../config/config';

export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface GeminiProxyRequest {
  model?: string;
  contents: any;
  systemInstruction?: any;
  generationConfig?: any;
  tools?: Array<{ google_search: Record<string, never> }>;
}

export interface GeminiProxyResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: {
          uri?: string;
          title?: string;
        };
      }>;
    };
    finishReason?: string;
  }>;
  text?: string;
}

export interface GeminiGroundedResult {
  text: string;
  sources: GroundingSource[];
}

export interface AiCapabilities {
  providers: {
    gemini: boolean;
    ipdata?: boolean;
    ransomwareLive?: boolean;
  };
  defaultGeminiModel?: string;
}

export type GeminiProxyErrorCode =
  | 'PROVIDER_NOT_CONFIGURED'
  | 'RATE_LIMITED'
  | 'DEMO_READ_ONLY'
  | 'PROVIDER_ERROR'
  | 'UNREACHABLE';

export class GeminiProxyError extends Error {
  code: GeminiProxyErrorCode;
  status?: number;

  constructor(code: GeminiProxyErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'GeminiProxyError';
    this.code = code;
    this.status = status;
  }
}

function sanitizeSourceUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // Reject malformed URLs or unsafe schemes
  }
  return null;
}

export function extractGroundingSources(data?: GeminiProxyResponse | null): GroundingSource[] {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];

  const seen = new Set<string>();
  const sources: GroundingSource[] = [];
  for (const chunk of chunks) {
    const uri = sanitizeSourceUrl(chunk?.web?.uri);
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    const title = (chunk?.web?.title || '').trim() || new URL(uri).hostname;
    sources.push({ title, uri });
  }
  return sources;
}

export function classifyGeminiProxyError(err: unknown): GeminiProxyError {
  if (err instanceof GeminiProxyError) return err;
  const e = err as {
    code?: string;
    message?: string;
    response?: { status?: number; data?: { code?: string; message?: string } };
  };
  const status = e?.response?.status;
  const apiCode = e?.response?.data?.code;

  if (e?.code === 'ERR_DEMO_READ_ONLY') {
    return new GeminiProxyError(
      'DEMO_READ_ONLY',
      'Live AI research queries are disabled in read-only public demo mode. Sign in with an authenticated workspace to query the AI backend.',
      403,
    );
  }
  if (status === 503 || apiCode === 'PROVIDER_NOT_CONFIGURED') {
    return new GeminiProxyError(
      'PROVIDER_NOT_CONFIGURED',
      'Cloud AI assistant is not configured on the backend server (GEMINI_API_KEY missing). Contact your administrator to set GEMINI_API_KEY and enable VITE_AI_ENABLED.',
      503,
    );
  }
  if (status === 429) {
    return new GeminiProxyError(
      'RATE_LIMITED',
      'AI proxy rate limit or upstream quota exceeded. Please wait briefly and retry.',
      429,
    );
  }
  if (status && status >= 500) {
    return new GeminiProxyError(
      'PROVIDER_ERROR',
      e?.response?.data?.message || 'Upstream AI provider returned a server error.',
      status,
    );
  }
  return new GeminiProxyError(
    'UNREACHABLE',
    e?.message || 'Failed to communicate with the backend AI proxy.',
    status,
  );
}

/**
 * Checks non-secret server-side AI provider availability without running a billable prompt.
 */
export const getAiCapabilities = async (): Promise<AiCapabilities | null> => {
  try {
    const response = await api.get<AiCapabilities>(API_ENDPOINTS.PROXY_CAPABILITIES);
    if (response.data && typeof response.data?.providers?.gemini === 'boolean') {
      return response.data;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Sends content generation requests to the backend proxy route and preserves grounding citations.
 * Keeps GEMINI_API_KEY secure on the backend server — never bundled into client JavaScript.
 */
export const generateGeminiGroundedContent = async (
  request: GeminiProxyRequest
): Promise<GeminiGroundedResult> => {
  const model = request.model || GEMINI_DEFAULT_MODEL;

  let contentsPayload = request.contents;
  if (typeof contentsPayload === 'string') {
    contentsPayload = [{ role: 'user', parts: [{ text: contentsPayload }] }];
  } else if (!Array.isArray(contentsPayload)) {
    contentsPayload = [contentsPayload];
  }

  try {
    const response = await api.post<GeminiProxyResponse>(
      API_ENDPOINTS.PROXY_GEMINI,
      {
        model,
        contents: contentsPayload,
        systemInstruction: request.systemInstruction,
        generationConfig: request.generationConfig,
        ...(request.tools ? { tools: request.tools } : {}),
      }
    );

    const candidate = response.data?.candidates?.[0];
    const partsText = (candidate?.content?.parts || [])
      .map((part) => part?.text || '')
      .filter(Boolean)
      .join('\n')
      .trim();
    const text = partsText || response.data?.text || '';
    const sources = extractGroundingSources(response.data);
    return { text, sources };
  } catch (err) {
    throw classifyGeminiProxyError(err);
  }
};

export const generateGeminiContent = async (
  request: GeminiProxyRequest
): Promise<string> => {
  const res = await generateGeminiGroundedContent(request);
  return res.text;
};

export interface ThreatChatSession {
  sendMessageStream: ({ message }: { message: string }) => AsyncGenerator<{ text: string }, void, unknown>;
}

/**
 * Creates a threat chat session that routes through the backend proxy.
 */
export const createThreatChat = (context: string): ThreatChatSession => {
  const history: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  const systemInstruction = {
    parts: [
      {
        text: `You are ANTI.AI, an elite cybersecurity threat intelligence assistant.
Embedded in ANTITODE Security Operations platform.

CURRENT SESSION CONTEXT:
${context}

ROLE & BEHAVIOR:
- Act as a senior SOC analyst and forensic investigator.
- Provide concise, actionable, and technical responses.
- Use Markdown for formatting lists, code blocks, and headers.
- Maintain a vigilant, professional tone suitable for a security operations center.`,
      },
    ],
  };

  return {
    sendMessageStream: async function* ({ message }: { message: string }) {
      history.push({ role: 'user', parts: [{ text: message }] });

      try {
        const text = await generateGeminiContent({
          contents: history,
          systemInstruction,
          generationConfig: { temperature: 0.3 },
        });

        if (text) {
          history.push({ role: 'model', parts: [{ text }] });
          const words = text.split(' ');
          let buffer = '';
          for (let i = 0; i < words.length; i++) {
            buffer += (i > 0 ? ' ' : '') + words[i];
            if (i % 6 === 0 || i === words.length - 1) {
              yield { text: buffer };
              buffer = '';
            }
          }
          if (buffer) yield { text: buffer };
          return;
        }
      } catch (err) {
        const classified = classifyGeminiProxyError(err);
        console.warn('[GeminiProxy] Backend proxy call failed:', classified.code);
        yield {
          text: `**Cloud AI Unavailable (${classified.code})**\n\n${classified.message}`,
        };
        return;
      }

      yield {
        text: '**Cloud AI Unavailable**\n\nThe backend AI proxy returned an empty response.',
      };
    },
  };
};
