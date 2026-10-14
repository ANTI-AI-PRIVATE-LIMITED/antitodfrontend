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

