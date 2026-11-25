export interface ExternalTargetInspection {
  valid: boolean;
  href: string;
  defanged: string;
  isOnion: boolean;
  reason?: string;
}

/**
 * Defangs HTTP/HTTPS URLs (hxxp/hxxps + [.]) so analysts can inspect destinations safely without accidental clicks.
 */
export function defangUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const scheme = u.protocol === 'https:' ? 'hxxps://' : u.protocol === 'http:' ? 'hxxp://' : `${u.protocol}//`;
    const defangedHost = u.host.replace(/\./g, '[.]');
    return `${scheme}${defangedHost}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return raw.replace(/^https:/i, 'hxxps:').replace(/^http:/i, 'hxxp:').replace(/\./g, '[.]');
  }
}

/**
 * Validates and classifies victim/leak site URLs before exposing them to an analyst.
 * Rejects dangerous protocols (javascript:, data:, vbscript:, file:) and detects .onion darkweb hosts.
 */
export function inspectRansomwareTargetUrl(rawUrl?: string): ExternalTargetInspection {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, href: '', defanged: '', isOnion: false, reason: 'Empty target URL' };
  }

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  if (hasScheme && !/^https?:\/\//i.test(trimmed)) {
    return {
      valid: false,
      href: '',
      defanged: trimmed,
      isOnion: false,
      reason: 'Blocked unsafe URL scheme (only http/https URLs permitted)',
    };
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        href: '',
        defanged: defangUrl(candidate),
        isOnion: false,
        reason: 'Unsupported protocol',
      };
    }
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || /\s/.test(hostname)) {
      return { valid: false, href: '', defanged: '', isOnion: false, reason: 'Malformed host' };
    }
    const isOnion = hostname === 'onion' || hostname.endsWith('.onion');
    return {
      valid: true,
      href: parsed.toString(),
      defanged: defangUrl(parsed.toString()),
      isOnion,
    };
  } catch {
    return {
      valid: false,
      href: '',
      defanged: defangUrl(trimmed),
      isOnion: false,
      reason: 'Malformed URL',
    };
  }
}
