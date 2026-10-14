/**
 * User-Scoped Storage Utility (Task 97)
 * Ensures that investigation cases, brand assets, analysis filters,
 * and user API keys are keyed by the active Admin ID in browser storage.
 *
 * Prevents two users on a shared browser from sharing sensitive operational data.
 */

export function getActiveAdminId(): string {
  try {
    const directId = localStorage.getItem('xyberah_active_admin_id');
    if (directId) return directId;

    const rawAdmin = localStorage.getItem('xyberah_current_admin');
    if (rawAdmin) {
      const parsed = JSON.parse(rawAdmin);
      if (parsed?.AdminID) return String(parsed.AdminID);
    }

    // Try parsing JWT token if present
    const token = localStorage.getItem('authtoken') || localStorage.getItem('admin-auth-token');
    if (token && token.includes('.')) {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload?.AdminID) return String(payload.AdminID);
        if (payload?.adminId) return String(payload.adminId);
        if (payload?.id) return String(payload.id);
        if (payload?.sub && !payload.sub.includes('@')) return String(payload.sub);
      }
    }
  } catch {
    // Ignore JSON parse errors
  }
  return 'default';
}

/**
 * Returns a user-keyed localStorage key if an admin is logged in.
 * e.g., 'xyberah_cases' -> 'xyberah_cases_adm_123'
 */
export function getUserStorageKey(baseKey: string, customAdminId?: string): string {
  const adminId = customAdminId || getActiveAdminId();
  if (!adminId || adminId === 'default') {
    return baseKey;
  }
  return `${baseKey}_${adminId}`;
}

export const userStorage = {
  getItem: (baseKey: string): string | null => {
    try {
      const adminId = getActiveAdminId();
      if (adminId && adminId !== 'default') {
        const scopedKey = getUserStorageKey(baseKey, adminId);
        return localStorage.getItem(scopedKey);
      }
      return localStorage.getItem(baseKey);
    } catch {
      return null;
    }
  },

  setItem: (baseKey: string, value: string): void => {
    try {
      const scopedKey = getUserStorageKey(baseKey);
      localStorage.setItem(scopedKey, value);
    } catch (e) {
      console.warn('[userStorage] Failed to set item:', e);
    }
  },

  removeItem: (baseKey: string): void => {
    try {
      const scopedKey = getUserStorageKey(baseKey);
      localStorage.removeItem(scopedKey);
      localStorage.removeItem(baseKey);
    } catch (e) {
      console.warn('[userStorage] Failed to remove item:', e);
    }
  },
};

/**
 * Purges all user-specific data from browser storage on sign out, 401, and session expiry.
 * Clears:
 * - xyberah_* entries (cases, bench, brand assets, filters, cache, settings, demo mode)
 * - antitode_* entries (cases, investigations, settings, views)
 * - user_* keys (API keys, profiles)
 * - authtoken, authtoken_expires, admin-auth-token, admin-meta
 * - Cached feeds (cve_feed_cache, exploit_feed_cache, threat_news_cache, etc.)
 * - CyberChef inputs & recipes (cyberchef_input, cyberchef_recipe)
 * - Chat & AI conversation history (chat_*, threat_chat_*)
 * - All sessionStorage
 */
export function clearAllUserBrowserData(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const lower = key.toLowerCase();
      if (
        lower.startsWith('xyberah') ||
        lower.startsWith('antitode') ||
        lower.startsWith('user_') ||
        lower.startsWith('user-') ||
        lower.startsWith('admin') ||
        lower.startsWith('auth') ||
        lower.includes('token') ||
        lower.includes('feed') ||
        lower.includes('cache') ||
        lower.includes('chat') ||
        lower.includes('case') ||
        lower.includes('investigation') ||
        lower.includes('cyberchef') ||
        lower.includes('session') ||
        lower.includes('history') ||
        lower.includes('plan')
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn('[clearAllUserBrowserData] Error clearing localStorage:', err);
  }

  try {
    sessionStorage.clear();
  } catch (err) {
    console.warn('[clearAllUserBrowserData] Error clearing sessionStorage:', err);
  }
}
