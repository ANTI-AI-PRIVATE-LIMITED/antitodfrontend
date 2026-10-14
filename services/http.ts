import { toProxyUrl, formatProxyErrorMessage } from './proxy';

interface ProxyConfig {
    url: (target: string) => string;
    name: string;
    supportsHeaders: boolean;
}

// Order: Backend proxy (allowlisted feeds) -> Direct fallback (for public CORS-enabled feeds)
// Public relays (allorigins, corsproxy) have been removed per Task 101.
const PROXIES: ProxyConfig[] = [
    { name: 'BackendProxy', url: (u) => toProxyUrl(u), supportsHeaders: true },
    { name: 'Direct', url: (u) => u, supportsHeaders: true },
];

/**
 * Fetches text content from a URL using the backend proxy route with direct fallback.
 * @param targetUrl The URL to fetch
 * @param options Optional configuration including validation predicate and headers
 */
export const fetchWithCors = async (
    targetUrl: string,
    options?: {
        validate?: (text: string) => boolean;
        headers?: Record<string, string>;
        requiresHeaders?: boolean;
    }
): Promise<string> => {
    const applicableProxies = options?.requiresHeaders 
        ? PROXIES.filter(p => p.supportsHeaders)
        : PROXIES;

    for (const proxy of applicableProxies) {
        try {
            const proxyEndpoint = proxy.url(targetUrl);
            
            const fetchOptions: RequestInit = {
                method: 'GET'
            };

            if (options?.headers && proxy.supportsHeaders) {
                fetchOptions.headers = options.headers;
            }

            const res = await fetch(proxyEndpoint, fetchOptions);

            if (res.ok) {
                const text = await res.text();

                // If a validator is provided, ensure the content passes
                if (options?.validate && !options.validate(text)) {
                    continue;
                }
                
                return text;
            } else {
                let errorData: any = null;
                try {
                    errorData = await res.json();
                } catch {
                    // Not JSON
                }
                const msg = formatProxyErrorMessage(res.status, errorData);
                console.warn(`[HTTP] ${proxy.name} request returned status ${res.status}: ${msg} (${targetUrl})`);
            }
        } catch (e: any) {
            // Continue to next proxy
        }
    }

    throw new Error(`Failed to fetch ${targetUrl} from all available sources.`);
};

/**
 * Helper to fetch and parse JSON directly with validation
 */
export const fetchJsonWithCors = async <T>(
    targetUrl: string,
    options?: { headers?: Record<string, string>; requiresHeaders?: boolean }
): Promise<T> => {
    const isJson = (text: string) => {
        const t = text.trim();
        return (t.startsWith('{') || t.startsWith('[')) && !t.startsWith('<') && !t.toLowerCase().startsWith('error');
    };

    try {
        const text = await fetchWithCors(targetUrl, {
            validate: isJson,
            headers: options?.headers,
            requiresHeaders: options?.requiresHeaders
        });
        return JSON.parse(text) as T;
    } catch (e) {
        console.warn(`Fetch failed for ${targetUrl}`);
        throw new Error("Invalid JSON response or all proxies failed");
    }
};
