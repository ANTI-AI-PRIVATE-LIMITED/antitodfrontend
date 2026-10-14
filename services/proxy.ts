import { BACKEND_URL, AUTH_CONFIG } from '../config/config';

export const PROXY_ROUTE = '/AdminRoutes/proxy/fetch';

/**
 * Transforms an arbitrary target URL into a proxied URL routed through the backend.
 * Route: GET /AdminRoutes/proxy/fetch?url=<encoded https url>
 *
 * Rules:
 * - Admin token required (authtoken header)
 * - HTTPS only, GET only
 * - Allowlisted hosts only
 * - 10s timeout, 5MB limit, 5 min cache
 */
export function toProxyUrl(target: string): string {
    const base = (BACKEND_URL || '').replace(/\/+$/, '');
    const encoded = encodeURIComponent(target.trim());
    return `${base}${PROXY_ROUTE}?url=${encoded}`;
}

export interface ProxyErrorPayload {
    code?: string;
    message?: string;
    error?: string;
}

/**
 * Formats known proxy error codes into user-friendly diagnostic messages.
 * Known codes: 403 HOST_NOT_ALLOWED, 502 UPSTREAM_ERROR, 429 PROXY_RATE_LIMITED, 413 TOO_LARGE.
 */
export function formatProxyErrorMessage(status: number, data?: ProxyErrorPayload | null): string {
    const code = data?.code || '';

    if (status === 403 || code === 'HOST_NOT_ALLOWED') {
        return data?.message || 'Target host is not in the security proxy allowlist (403 HOST_NOT_ALLOWED).';
    }
    if (status === 502 || code === 'UPSTREAM_ERROR') {
        return data?.message || 'Upstream intelligence provider is unreachable (502 UPSTREAM_ERROR).';
    }
    if (status === 429 || code === 'PROXY_RATE_LIMITED') {
        return data?.message || 'Security proxy rate limit exceeded. Please wait a moment and retry (429 PROXY_RATE_LIMITED).';
    }
    if (status === 413 || code === 'TOO_LARGE') {
        return data?.message || 'Response payload exceeds the 5MB proxy limit (413 TOO_LARGE).';
    }

    return data?.message || data?.error || `Proxy error: HTTP ${status}`;
}

/**
 * Helper to build headers with authtoken attached for proxy requests.
 */
export function getProxyHeaders(customHeaders?: HeadersInit): Headers {
    const headers = new Headers(customHeaders);
    const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_CONFIG.TOKEN_KEY) : null;
    if (token && !headers.has(AUTH_CONFIG.TOKEN_HEADER)) {
        headers.set(AUTH_CONFIG.TOKEN_HEADER, token);
    }
    return headers;
}

let isInterceptorInstalled = false;

/**
 * Global fetch wrapper: automatically injects the `authtoken` header from
 * `localStorage['admin-auth-token']` for any request targeting `/AdminRoutes/proxy/fetch`.
 */
export function installProxyFetchInterceptor(force: boolean = false): void {
    if (typeof window === 'undefined' || (isInterceptorInstalled && !force)) return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        let urlStr = '';
        if (typeof input === 'string') {
            urlStr = input;
        } else if (input instanceof URL) {
            urlStr = input.toString();
        } else if (input && typeof (input as Request).url === 'string') {
            urlStr = (input as Request).url;
        }

        if (urlStr.includes(PROXY_ROUTE)) {
            const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
            const headers = new Headers(
                init?.headers || (typeof input !== 'string' && !(input instanceof URL) ? (input as Request).headers : undefined)
            );

            if (token && !headers.has(AUTH_CONFIG.TOKEN_HEADER)) {
                headers.set(AUTH_CONFIG.TOKEN_HEADER, token);
            }

            return originalFetch(input, {
                ...init,
                headers,
            });
        }

        return originalFetch(input, init);
    };

    isInterceptorInstalled = true;
}

// Auto-install interceptor on module import
installProxyFetchInterceptor();

/**
 * Robust fetch helper through the backend proxy route with built-in auth and status reporting.
 */
export async function proxyFetch(targetUrl: string, init?: RequestInit): Promise<Response> {
    const url = toProxyUrl(targetUrl);
    return fetch(url, init);
}

/**
 * Fetches JSON directly via the backend proxy, safely handling non-200 responses without crashing.
 */
export async function fetchJsonViaProxy<T = any>(targetUrl: string, init?: RequestInit): Promise<T | null> {
    try {
        const response = await proxyFetch(targetUrl, init);
        if (!response.ok) {
            let errorPayload: ProxyErrorPayload | null = null;
            try {
                errorPayload = await response.json();
            } catch {
                // Ignore json parse error on non-json error responses
            }
            console.warn(`[ProxyFetch] ${formatProxyErrorMessage(response.status, errorPayload)} (${targetUrl})`);
            return null;
        }
        return (await response.json()) as T;
    } catch (err: any) {
        console.warn(`[ProxyFetch] Request failed for ${targetUrl}:`, err.message);
        return null;
    }
}

/**
 * Fetches text/XML directly via the backend proxy, safely handling errors without crashing.
 */
export async function fetchTextViaProxy(targetUrl: string, init?: RequestInit): Promise<string | null> {
    try {
        const response = await proxyFetch(targetUrl, init);
        if (!response.ok) {
            let errorPayload: ProxyErrorPayload | null = null;
            try {
                errorPayload = await response.json();
            } catch {
                // Ignore
            }
            console.warn(`[ProxyFetch] ${formatProxyErrorMessage(response.status, errorPayload)} (${targetUrl})`);
            return null;
        }
        return await response.text();
    } catch (err: any) {
        console.warn(`[ProxyFetch] Request failed for ${targetUrl}:`, err.message);
        return null;
    }
}
