export interface SecurityHeaderEvaluation {
    name: string;
    value: string;
    valid: boolean;
}

export const SECURITY_HEADER_CHECKS: ReadonlyArray<{
    name: string;
    key: string;
    meta?: string;
}> = [
    { name: 'Strict-Transport-Security', key: 'strict-transport-security' },
    { name: 'Content-Security-Policy', key: 'content-security-policy', meta: 'Content-Security-Policy' },
    { name: 'X-Frame-Options', key: 'x-frame-options' },
    { name: 'X-Content-Type-Options', key: 'x-content-type-options' },
    { name: 'Referrer-Policy', key: 'referrer-policy', meta: 'referrer' },
    { name: 'Permissions-Policy', key: 'permissions-policy' },
];

/**
 * Evaluates baseline HTTP security headers using both HTTP response headers and optional HTML meta tags.
 */
export function evaluateSecurityHeaders(
    headers: Record<string, string> = {},
    metaTags: Record<string, string> = {}
): SecurityHeaderEvaluation[] {
    return SECURITY_HEADER_CHECKS.map(check => {
        let val = headers[check.key];
        if (!val && check.meta) {
            const metaKey = Object.keys(metaTags).find(k => k.toLowerCase() === check.meta?.toLowerCase());
            if (metaKey) val = metaTags[metaKey];
        }

        return {
            name: check.name,
            value: val || 'Missing',
            valid: Boolean(val && val !== 'Missing'),
        };
    });
}
